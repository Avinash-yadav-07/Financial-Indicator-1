import React, { useState, useEffect, useRef } from "react";
import {
  Grid,
  Card,
  Typography,
  Box,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Button,
  CircularProgress,
} from "@mui/material";
import * as echarts from "echarts";
import { db } from "../manage-employee/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import Table from 'react-bootstrap/Table';
import 'bootstrap/dist/css/bootstrap.min.css';

// Utility function to calculate average monthly expenses
const calculateAverageMonthlyExpenses = (expenses) => {
  if (expenses.length === 0) return 0;

  const monthlyExpenses = {};
  expenses.forEach((expense) => {
    const date = expense.date;
    const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;
    if (!monthlyExpenses[monthYear]) {
      monthlyExpenses[monthYear] = 0;
    }
    monthlyExpenses[monthYear] += expense.amount;
  });

  const monthlyTotals = Object.values(monthlyExpenses);
  const sumMonthlyTotals = monthlyTotals.reduce((sum, total) => sum + total, 0);
  const numberOfMonths = monthlyTotals.length;

  return numberOfMonths > 0 ? sumMonthlyTotals / numberOfMonths : 0;
};

// Utility function to calculate financial runway
const calculateRunwayMonths = (earnings, expenses) => {
  const totalEarnings = earnings.reduce((sum, earning) => sum + earning.amount, 0);
  const averageMonthlyExpenses = calculateAverageMonthlyExpenses(expenses);
  return averageMonthlyExpenses > 0 ? totalEarnings / averageMonthlyExpenses : 0;
};

const FinancialOverview = () => {
  const [view, setView] = useState("Organization Level");
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [organizationExpenses, setOrganizationExpenses] = useState([]);
  const [organizationEarnings, setOrganizationEarnings] = useState([]);
  const [accountExpenses, setAccountExpenses] = useState([]);
  const [accountEarnings, setAccountEarnings] = useState([]);
  const [activeTab, setActiveTab] = useState("Expenses");
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Fetch organization-level data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch accounts
        const accountsSnapshot = await getDocs(collection(db, "accounts"));
        const accountsData = accountsSnapshot.docs.map((doc) => ({
          id: doc.id,
          accountId: doc.data().accountId,
          ...doc.data(),
        }));
        setAccounts(accountsData);

        // Fetch expenses
        const expensesSnapshot = await getDocs(collection(db, "expenses"));
        const expensesData = expensesSnapshot.docs.map((doc) => ({
          id: doc.id,
          date: doc.data().date.toDate(),
          amount: doc.data().amount,
          category: doc.data().category,
          accountId: doc.data().accountId,
          referenceId: doc.data().referenceId,
        }));
        setOrganizationExpenses(expensesData);

        // Fetch earnings
        const earningsSnapshot = await getDocs(collection(db, "earnings"));
        const earningsData = earningsSnapshot.docs.map((doc) => ({
          id: doc.id,
          date: doc.data().date.toDate(),
          amount: doc.data().amount,
          category: doc.data().category,
          accountId: doc.data().accountId,
          referenceId: doc.data().referenceId,
        }));
        setOrganizationEarnings(earningsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch account-level data when selectedAccount changes
  useEffect(() => {
    const loadAccountData = async () => {
      if (selectedAccount) {
        setLoading(true);
        try {
          // Fetch account-specific expenses
          const expensesQuery = query(
            collection(db, "expenses"),
            where("accountId", "==", selectedAccount.accountId)
          );
          const expensesSnapshot = await getDocs(expensesQuery);
          const expensesData = expensesSnapshot.docs.map((doc) => ({
            id: doc.id,
            date: doc.data().date.toDate(),
            amount: doc.data().amount,
            category: doc.data().category,
            accountId: doc.data().accountId,
            referenceId: doc.data().referenceId,
          }));
          setAccountExpenses(expensesData);

          // Fetch account-specific earnings
          const earningsQuery = query(
            collection(db, "earnings"),
            where("accountId", "==", selectedAccount.accountId)
          );
          const earningsSnapshot = await getDocs(earningsQuery);
          const earningsData = earningsSnapshot.docs.map((doc) => ({
            id: doc.id,
            date: doc.data().date.toDate(),
            amount: doc.data().amount,
            category: doc.data().category,
            accountId: doc.data().accountId,
            referenceId: doc.data().referenceId,
          }));
          setAccountEarnings(earningsData);
        } catch (error) {
          console.error("Error fetching account data:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    loadAccountData();
  }, [selectedAccount]);

  // Update chart based on activeTab, view, and data changes
  useEffect(() => {
    if (!chartRef.current) return;

    let data;
    if (activeTab === "Expenses") {
      data = transformDataToPieData(
        view === "Organization Level" ? organizationExpenses : accountExpenses
      );
    } else if (activeTab === "Earning") {
      data = transformDataToPieData(
        view === "Organization Level" ? organizationEarnings : accountEarnings
      );
    } else if (activeTab === "Profit and Loss") {
      const expenses = view === "Organization Level" ? organizationExpenses : accountExpenses;
      const earnings = view === "Organization Level" ? organizationEarnings : accountEarnings;
      data = aggregateDataByMonth(expenses, earnings);
    } else if (activeTab === "Financial Runway") {
      const earnings = view === "Organization Level" ? organizationEarnings : accountEarnings;
      const expenses = view === "Organization Level" ? organizationExpenses : accountExpenses;
      const runwayMonths = calculateRunwayMonths(earnings, expenses);
      data = { runwayMonths };
    }
    updateChart(data);
  }, [
    activeTab,
    view,
    selectedAccount,
    organizationExpenses,
    organizationEarnings,
    accountExpenses,
    accountEarnings,
  ]);

  // Function to update the ECharts instance
  const updateChart = (data) => {
    if (!chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.dispose();
      chartInstance.current = null;
    }

    chartInstance.current = echarts.init(chartRef.current);

    if (activeTab === "Profit and Loss") {
      const option = {
        title: { text: "Earnings vs Expenses", subtext: "Monthly Comparison" },
        tooltip: { trigger: "axis" },
        legend: { data: ["Earnings", "Expenses"] },
        xAxis: [{ type: "category", data: data.months }],
        yAxis: [{ type: "value" }],
        series: [
          {
            name: "Earnings",
            type: "bar",
            data: data.earnings,
          },
          {
            name: "Expenses",
            type: "bar",
            data: data.expenses,
          },
        ],
      };
      chartInstance.current.setOption(option);
    } else if (activeTab === "Financial Runway") {
      const option = {
        title: {
          text: "Financial Runway",
          subtext: "Months of Operation Based on Current Earnings",
        },
        tooltip: { trigger: "axis" },
        xAxis: { type: "category", data: ["Runway Months"] },
        yAxis: { type: "value" },
        series: [
          {
            name: "Runway Months",
            type: "bar",
            data: [data.runwayMonths],
          },
        ],
      };
      chartInstance.current.setOption(option);
    } else {
      const option = {
        tooltip: { trigger: "item" },
        legend: { top: "5%", left: "center" },
        series: [
          {
            name: activeTab === "Expenses" ? "Expenses" : "Earnings",
            type: "pie",
            radius: ["40%", "70%"],
            avoidLabelOverlap: false,
            padAngle: 5,
            itemStyle: { borderRadius: 10 },
            label: { show: false, position: "center" },
            emphasis: { label: { show: true, fontSize: 20, fontWeight: "bold" } },
            labelLine: { show: false },
            data: data.length ? data : [{ value: 0, name: "No Data" }],
          },
        ],
      };
      chartInstance.current.setOption(option);
      chartInstance.current.on("click", (params) => {
        setSelectedCategory(params.name);
      });
    }
  };

  // Function to aggregate data by month
  const aggregateDataByMonth = (expenses, earnings) => {
    const monthlyData = {};
    const getMonthYear = (date) => `${date.getFullYear()}-${date.getMonth() + 1}`;

    expenses.forEach((expense) => {
      const monthYear = getMonthYear(expense.date);
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { expenses: 0, earnings: 0 };
      }
      monthlyData[monthYear].expenses += expense.amount;
    });

    earnings.forEach((earning) => {
      const monthYear = getMonthYear(earning.date);
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { expenses: 0, earnings: 0 };
      }
      monthlyData[monthYear].earnings += earning.amount;
    });

    const months = Object.keys(monthlyData).sort();
    const expensesData = months.map((month) => monthlyData[month].expenses);
    const earningsData = months.map((month) => monthlyData[month].earnings);

    return { months, expenses: expensesData, earnings: earningsData };
  };

  // Function to transform data into pie chart format
  const transformDataToPieData = (data) => {
    if (!data || !Array.isArray(data)) return [];
    const categoryMap = data.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = 0;
      acc[item.category] += item.amount;
      return acc;
    }, {});
    return Object.keys(categoryMap).map((category) => ({
      name: category,
      value: categoryMap[category],
    }));
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedCategory(null);
  };

  // Handle view change
  const handleViewChange = (event) => {
    setView(event.target.value);
    setSelectedCategory(null);
  };

  // Handle account change
  const handleAccountChange = (event) => {
    setSelectedAccount(event.target.value);
    setSelectedCategory(null);
  };

  // Get breakdown data based on selected category
  const getBreakdownData = () => {
    const data =
      activeTab === "Expenses"
        ? view === "Organization Level"
          ? organizationExpenses
          : accountExpenses
        : view === "Organization Level"
        ? organizationEarnings
        : accountEarnings;

    return selectedCategory ? data.filter((item) => item.category === selectedCategory) : data;
  };

  return (
    <Box p={3} sx={{ marginLeft: "250px", marginTop: "30px", width: "calc(100% - 250px)" }}>
      <Grid item xs={12}>
        <Card sx={{ marginTop: "20px", borderRadius: "12px", overflow: "visible" }}>
          <Box mx={2} mt={-3} py={3} px={2} bgcolor="info.main" borderRadius="12px">
            <Typography variant="h6" color="white">
              Financial Overview
            </Typography>
          </Box>
          <Box pt={3} pb={2} px={2}>
            <Box display="flex" gap={3} mb={3}>
              {["Expenses", "Earning", "Profit and Loss", "Financial Runway"].map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "contained" : "outlined"}
                  onClick={() => handleTabChange(tab)}
                  sx={{
                    color: activeTab === tab ? "white" : "primary.main",
                    backgroundColor: activeTab === tab ? "primary.main" : "transparent",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    "&:hover": {
                      backgroundColor: activeTab === tab ? "primary.dark" : "primary.light",
                    },
                  }}
                >
                  {tab}
                </Button>
              ))}
            </Box>

            {(activeTab === "Expenses" ||
              activeTab === "Earning" ||
              activeTab === "Profit and Loss" ||
              activeTab === "Financial Runway") && (
              <>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>View</InputLabel>
                  <Select value={view} onChange={handleViewChange} label="View">
                    <MenuItem value="Organization Level">Organization Level</MenuItem>
                    <MenuItem value="Account Level">Account Level</MenuItem>
                  </Select>
                </FormControl>

                {view === "Account Level" && (
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Account</InputLabel>
                    <Select
                      value={selectedAccount || ""}
                      onChange={handleAccountChange}
                      label="Account"
                    >
                      {accounts.map((account) => (
                        <MenuItem key={account.id} value={account}>
                          {account.accountId}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                <Box display="grid" gridTemplateColumns="1fr 1fr" gap={3}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {view === "Organization Level"
                        ? `Organization ${
                            activeTab === "Profit and Loss" ? "Profit and Loss" : activeTab
                          } Breakdown`
                        : selectedAccount
                        ? `${selectedAccount.accountId} ${
                            activeTab === "Profit and Loss" ? "Profit and Loss" : activeTab
                          } Breakdown`
                        : "Select an Account"}
                    </Typography>
                    {loading ? (
                      <Box display="flex" justifyContent="center" mt={5}>
                        <CircularProgress />
                      </Box>
                    ) : view === "Account Level" && !selectedAccount ? (
                      <Typography variant="h6" sx={{ textAlign: "center", mt: 5 }}>
                        Please select an account
                      </Typography>
                    ) : (
                      <Box ref={chartRef} sx={{ width: "100%", height: 400 }} />
                    )}
                  </Box>

                  {(activeTab === "Expenses" || activeTab === "Earning") && (
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Breakdown Details
                      </Typography>
                      <Table responsive striped bordered hover>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Reference ID</th>
                            <th>Account ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getBreakdownData().map((item) => (
                            <tr key={item.id}>
                              <td>{item.date.toLocaleDateString()}</td>
                              <td>{item.amount}</td>
                              <td>{item.referenceId || "N/A"}</td>
                              <td>{item.accountId}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Box>
                  )}
                </Box>
              </>
            )}
          </Box>
        </Card>
      </Grid>
    </Box>
  );
};

export default FinancialOverview;
