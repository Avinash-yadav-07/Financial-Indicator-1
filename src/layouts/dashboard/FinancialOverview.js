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
} from "@mui/material";
import * as echarts from "echarts";
import { db } from "../manage-employee/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

const FinancialOverview = () => {
  const [view, setView] = useState("Organization Level");
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [organizationExpenses, setOrganizationExpenses] = useState([]);
  const [organizationEarnings, setOrganizationEarnings] = useState([]);
  const [accountExpenses, setAccountExpenses] = useState([]);
  const [accountEarnings, setAccountEarnings] = useState([]);
  const [activeTab, setActiveTab] = useState("Expenses"); // Set "Expenses" as default
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch accounts
      const accountsSnapshot = await getDocs(collection(db, "accounts"));
      const accountsData = accountsSnapshot.docs.map((doc) => ({
        id: doc.id, // Firebase document ID
        accountId: doc.data().accountId, // Use the accountId field from Firestore
        ...doc.data(),
      }));
      setAccounts(accountsData);

      // Fetch organization-level expenses
      const expensesSnapshot = await getDocs(collection(db, "expenses"));
      const expensesData = expensesSnapshot.docs.map((doc) => ({
        id: doc.id,
        date: doc.data().date.toDate(), // Convert Firestore timestamp to JavaScript Date
        amount: doc.data().amount,
        category: doc.data().category,
        accountId: doc.data().accountId, // Ensure accountId is included
      }));
      setOrganizationExpenses(expensesData);

      // Fetch organization-level earnings
      const earningsSnapshot = await getDocs(collection(db, "earnings"));
      const earningsData = earningsSnapshot.docs.map((doc) => ({
        id: doc.id,
        date: doc.data().date.toDate(), // Convert Firestore timestamp to JavaScript Date
        amount: doc.data().amount,
        category: doc.data().category,
        accountId: doc.data().accountId, // Ensure accountId is included
      }));
      setOrganizationEarnings(earningsData);
    };

    fetchData();
  }, []);

  const fetchAccountData = async (accountId) => {
    // Fetch account-level expenses
    const expensesQuery = query(collection(db, "expenses"), where("accountId", "==", accountId));
    const expensesSnapshot = await getDocs(expensesQuery);
    const expensesData = expensesSnapshot.docs.map((doc) => ({
      id: doc.id,
      date: doc.data().date.toDate(),
      amount: doc.data().amount,
      category: doc.data().category,
      accountId: doc.data().accountId,
    }));
    setAccountExpenses(expensesData);

    // Fetch account-level earnings
    const earningsQuery = query(collection(db, "earnings"), where("accountId", "==", accountId));
    const earningsSnapshot = await getDocs(earningsQuery);
    const earningsData = earningsSnapshot.docs.map((doc) => ({
      id: doc.id,
      date: doc.data().date.toDate(),
      amount: doc.data().amount,
      category: doc.data().category,
      accountId: doc.data().accountId,
    }));
    setAccountEarnings(earningsData);
  };

  const updateChart = (data) => {
    if (!chartRef.current) return;

    // Destroy the existing chart instance if it exists
    if (chartInstance.current) {
      chartInstance.current.dispose();
      chartInstance.current = null;
    }

    // Initialize a new chart instance
    chartInstance.current = echarts.init(chartRef.current);

    if (activeTab === "Profit and Loss") {
      // Bar chart for Profit and Loss
      const option = {
        title: {
          text: "Earnings vs Expenses",
          subtext: "Monthly Comparison",
        },
        tooltip: {
          trigger: "axis",
        },
        legend: {
          data: ["Earnings", "Expenses"],
        },
        toolbox: {
          show: true,
          feature: {
            dataView: { show: true, readOnly: false },
            magicType: { show: true, type: ["line", "bar"] },
            restore: { show: true },
            saveAsImage: { show: true },
          },
        },
        calculable: true,
        xAxis: [
          {
            type: "category",
            data: data.months, // Months for the x-axis
          },
        ],
        yAxis: [
          {
            type: "value",
          },
        ],
        series: [
          {
            name: "Earnings",
            type: "bar",
            data: data.earnings, // Earnings data
            markPoint: {
              data: [
                { type: "max", name: "Max" },
                { type: "min", name: "Min" },
              ],
            },
            markLine: {
              data: [{ type: "average", name: "Avg" }],
            },
          },
          {
            name: "Expenses",
            type: "bar",
            data: data.expenses, // Expenses data
            markPoint: {
              data: [
                { type: "max", name: "Max" },
                { type: "min", name: "Min" },
              ],
            },
            markLine: {
              data: [{ type: "average", name: "Avg" }],
            },
          },
        ],
      };
      chartInstance.current.setOption(option);
    } else if (activeTab === "Financial Runway") {
      // Bar chart for Financial Runway
      const option = {
        title: {
          text: "Financial Runway",
          subtext: "Months of Runway Based on Current Expenses",
        },
        tooltip: {
          trigger: "axis",
        },
        xAxis: {
          type: "category",
          data: ["Runway Months"],
        },
        yAxis: {
          type: "value",
        },
        series: [
          {
            name: "Runway Months",
            type: "bar",
            data: [data.runwayMonths],
            markPoint: {
              data: [
                { type: "max", name: "Max" },
                { type: "min", name: "Min" },
              ],
            },
            markLine: {
              data: [{ type: "average", name: "Avg" }],
            },
          },
        ],
      };
      chartInstance.current.setOption(option);
    } else {
      // Pie chart for Expenses and Earning
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
            emphasis: {
              label: { show: true, fontSize: 20, fontWeight: "bold" },
            },
            labelLine: { show: false },
            data: data.length ? data : [{ value: 0, name: "No Data" }],
          },
        ],
      };
      chartInstance.current.setOption(option);
    }
  };

  const aggregateDataByMonth = (expenses, earnings) => {
    const monthlyData = {};

    // Helper function to get the month and year from a date
    const getMonthYear = (date) => {
      return `${date.getFullYear()}-${date.getMonth() + 1}`; // Format: "YYYY-MM"
    };

    // Aggregate expenses by month
    expenses.forEach((expense) => {
      const monthYear = getMonthYear(expense.date);
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { expenses: 0, earnings: 0 };
      }
      monthlyData[monthYear].expenses += expense.amount;
    });

    // Aggregate earnings by month
    earnings.forEach((earning) => {
      const monthYear = getMonthYear(earning.date);
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { expenses: 0, earnings: 0 };
      }
      monthlyData[monthYear].earnings += earning.amount;
    });

    // Convert to arrays for the chart
    const months = Object.keys(monthlyData).sort(); // Sort months chronologically
    const expensesData = months.map((month) => monthlyData[month].expenses);
    const earningsData = months.map((month) => monthlyData[month].earnings);

    return { months, expenses: expensesData, earnings: earningsData };
  };

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

  const calculateRunwayMonths = () => {
    const totalEarnings = organizationEarnings.reduce((sum, earning) => sum + earning.amount, 0);
    const totalExpenses = organizationExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const averageMonthlyExpenses = totalExpenses / organizationExpenses.length;
    const runwayMonths = totalEarnings / averageMonthlyExpenses;
    return { runwayMonths };
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setView("Organization Level"); // Reset view to "Organization Level" when switching tabs
    if (tab === "Expenses") {
      updateChart(transformDataToPieData(organizationExpenses));
    } else if (tab === "Earning") {
      updateChart(transformDataToPieData(organizationEarnings));
    } else if (tab === "Profit and Loss") {
      const data = aggregateDataByMonth(organizationExpenses, organizationEarnings);
      updateChart(data);
    } else if (tab === "Financial Runway") {
      const data = calculateRunwayMonths();
      updateChart(data);
    }
  };

  const handleViewChange = (event) => {
    const newView = event.target.value;
    setView(newView);

    if (newView === "Organization Level") {
      if (activeTab === "Expenses") {
        updateChart(transformDataToPieData(organizationExpenses));
      } else if (activeTab === "Earning") {
        updateChart(transformDataToPieData(organizationEarnings));
      } else if (activeTab === "Profit and Loss") {
        const data = aggregateDataByMonth(organizationExpenses, organizationEarnings);
        updateChart(data);
      } else if (activeTab === "Financial Runway") {
        const data = calculateRunwayMonths();
        updateChart(data);
      }
    } else if (newView === "Account Level" && selectedAccount) {
      if (activeTab === "Expenses") {
        updateChart(transformDataToPieData(accountExpenses));
      } else if (activeTab === "Earning") {
        updateChart(transformDataToPieData(accountEarnings));
      } else if (activeTab === "Profit and Loss") {
        const data = aggregateDataByMonth(accountExpenses, accountEarnings);
        updateChart(data);
      } else if (activeTab === "Financial Runway") {
        const data = calculateRunwayMonths();
        updateChart(data);
      }
    }
  };

  const handleAccountChange = async (event) => {
    const account = event.target.value;
    setSelectedAccount(account);
    await fetchAccountData(account.accountId);

    if (activeTab === "Expenses") {
      updateChart(transformDataToPieData(accountExpenses));
    } else if (activeTab === "Earning") {
      updateChart(transformDataToPieData(accountEarnings));
    } else if (activeTab === "Profit and Loss") {
      const data = aggregateDataByMonth(accountExpenses, accountEarnings);
      updateChart(data);
    } else if (activeTab === "Financial Runway") {
      const data = calculateRunwayMonths();
      updateChart(data);
    }
  };

  return (
    <Box p={3} sx={{ marginLeft: "250px", marginTop: "30px", width: "calc(100% - 250px)" }}>
      <Grid item xs={12}>
        <Card sx={{ marginTop: "20px", borderRadius: "12px", overflow: "visible" }}>
          <Box mx={2} mt={-3} py={3} px={2} bgcolor="info.main" borderRadius="lg">
            <Typography variant="h6" color="white">
              Financial Overview
            </Typography>
          </Box>
          <Box pt={3} pb={2} px={2}>
            <Box display="flex" gap={2} mb={2}>
              {["Expenses", "Earning", "Profit and Loss", "Financial Runway"].map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "contained" : "outlined"}
                  onClick={() => handleTabChange(tab)} // Use handleTabChange instead of setActiveTab
                  sx={{
                    color: activeTab === tab ? "white" : "primary.main", // Change font color based on active tab
                    backgroundColor: activeTab === tab ? "primary.main" : "transparent",
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
                      value={selectedAccount}
                      onChange={handleAccountChange} // Use handleAccountChange instead of setSelectedAccount
                      label="Account"
                    >
                      {accounts.map((account) => (
                        <MenuItem key={account.id} value={account}>
                          {account.accountId} {/* Display accountId (e.g., "ACC-7028") */}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

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
                  <Box ref={chartRef} sx={{ width: "100%", height: 400 }} />
                </Box>
              </>
            )}

            {activeTab !== "Expenses" &&
              activeTab !== "Earning" &&
              activeTab !== "Profit and Loss" &&
              activeTab !== "Financial Runway" && (
                <Typography variant="h6" sx={{ textAlign: "center", mt: 5 }}>
                  {activeTab} Page (Coming Soon)
                </Typography>
              )}
          </Box>
        </Card>
      </Grid>
    </Box>
  );
};

export default FinancialOverview;