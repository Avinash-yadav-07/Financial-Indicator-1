// src/layouts/dashboard/index.js
import { useState, useEffect } from "react";
import { Grid, Collapse, IconButton, Menu, MenuItem, Button } from "@mui/material";
import MDBox from "components/MDBox";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import PieChart from "examples/Charts/PieChart";
import ReportsBarChart from "examples/Charts/BarCharts/ReportsBarChart";
import DataTable from "examples/Tables/DataTable";
import {
  fetchExpensesByCategory,
  fetchEarningsByCategory,
  fetchExpenses,
  fetchEarnings,
} from "../../utils/fetchData";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import PropTypes from "prop-types";

function Dashboard() {
  const [expensesByCategory, setExpensesByCategory] = useState({});
  const [earningsByCategory, setEarningsByCategory] = useState({});
  const [selectedChartData, setSelectedChartData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [openCategory, setOpenCategory] = useState(null);
  const [activeCard, setActiveCard] = useState("expenses");
  const [dashboardLevel, setDashboardLevel] = useState("Organization Level");
  const [accountId, setAccountId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [accountAnchorEl, setAccountAnchorEl] = useState(null);

  // Handle dropdown menu open
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // Handle dropdown menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle Account ID dropdown open
  const handleAccountMenuOpen = (event) => {
    setAccountAnchorEl(event.currentTarget);
  };

  // Handle Account ID dropdown close
  const handleAccountMenuClose = () => {
    setAccountAnchorEl(null);
  };

  // Handle dashboard level change
  const handleDashboardLevelChange = (level) => {
    setDashboardLevel(level);
    setAccountId(null); // Reset Account ID when switching levels
    handleMenuClose();
  };

  // Handle Account ID selection
  const handleAccountIdChange = (id) => {
    setAccountId(id);
    handleAccountMenuClose();
  };

  // Fetch all data
  useEffect(() => {
    const loadData = async () => {
      const expensesData = await fetchExpenses();
      const earningsData = await fetchEarnings();
      console.log("Expenses Data:", expensesData); // Debugging
      console.log("Earnings Data:", earningsData); // Debugging
      setExpenses(expensesData);
      setEarnings(earningsData);

      // Calculate expenses and earnings by category
      const expensesByCat = expensesData.reduce((acc, expense) => {
        const category = expense.category;
        acc[category] = (acc[category] || 0) + expense.amount;
        return acc;
      }, {});
      const earningsByCat = earningsData.reduce((acc, earning) => {
        const category = earning.category;
        acc[category] = (acc[category] || 0) + earning.amount;
        return acc;
      }, {});

      setExpensesByCategory(expensesByCat);
      setEarningsByCategory(earningsByCat);

      // Simulate a click on the first pie chart by default
      handleChartClick(expensesByCat, "expenses");
    };
    loadData();
  }, []);

  // Filter data based on Account ID
  const filterDataByAccountId = (data) => {
    if (!accountId) return data; // Return all data if no Account ID is selected
    const filteredData = data.filter((item) => item.accountId === accountId);
    console.log("Filtered Data for Account ID:", accountId, filteredData); // Debugging
    return filteredData;
  };

  // Convert category-wise data to pie chart format
  const expensesPieChartData = Object.entries(
    filterDataByAccountId(expenses).reduce((acc, expense) => {
      const category = expense.category;
      acc[category] = (acc[category] || 0) + expense.amount;
      return acc;
    }, {})
  ).map(([category, amount]) => ({
    value: amount,
    name: category,
  }));

  const earningsPieChartData = Object.entries(
    filterDataByAccountId(earnings).reduce((acc, earning) => {
      const category = earning.category;
      acc[category] = (acc[category] || 0) + earning.amount;
      return acc;
    }, {})
  ).map(([category, amount]) => ({
    value: amount,
    name: category,
  }));

  console.log("Expenses Pie Chart Data:", expensesPieChartData); // Debugging
  console.log("Earnings Pie Chart Data:", earningsPieChartData); // Debugging

  // Calculate profit/loss
  const totalExpenses = expensesPieChartData.reduce((acc, { value }) => acc + value, 0);
  const totalEarnings = earningsPieChartData.reduce((acc, { value }) => acc + value, 0);
  const profitLoss = totalEarnings - totalExpenses;

  // Calculate financial runway
  const avgMonthlyExpense = totalExpenses / 12; // Assuming 12 months
  const financialRunway = profitLoss / avgMonthlyExpense; // Use profitLoss instead of totalEarnings

  // Data for Bar Charts (using Firebase data)
  const expensesEarningsBarChartData = {
    labels: ["Expenses", "Earnings"],
    xAxisData: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    yAxisName: "Amount",
    yAxisUnit: "$",
    seriesData: [
      {
        name: "Expenses",
        type: "bar",
        data: [totalExpenses], // Use total expenses
      },
      {
        name: "Earnings",
        type: "bar",
        data: [totalEarnings], // Use total earnings
      },
    ],
  };

  const financialRunwayBarChartData = {
    labels: ["Financial Runway"],
    xAxisData: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    yAxisName: "Months",
    yAxisUnit: "",
    seriesData: [
      {
        name: "Financial Runway",
        type: "bar",
        data: [financialRunway], // Use financial runway data
      },
    ],
    yAxis: {
      type: "value",
      name: "Months",
      min: Math.min(financialRunway, 0) - 5, // Allow negative values
      max: Math.max(financialRunway, 0) + 5, // Allow positive values
      axisLabel: {
        formatter: `{value}`, // Format the y-axis labels
      },
    },
  };

  console.log("Expenses vs Earnings Bar Chart Data:", expensesEarningsBarChartData); // Debugging
  console.log("Financial Runway Bar Chart Data:", financialRunwayBarChartData); // Debugging

  // Handle chart click
  const handleChartClick = (chartData, cardId) => {
    setSelectedChartData(chartData);
    setActiveCard(cardId);
  };

  // Handle category click
  const handleCategoryClick = (category) => {
    setOpenCategory(openCategory === category ? null : category);
  };

  // Prepare table data
  const tableColumns = [
    { Header: "Category", accessor: "category" },
    { Header: "Amount", accessor: "amount" },
    {
      Header: "Details",
      accessor: "details",
      Cell: ({ row }) => (
        <IconButton
          aria-label="expand row"
          size="small"
          onClick={() => handleCategoryClick(row.original.category)}
        >
          {openCategory === row.original.category ? (
            <KeyboardArrowUpIcon />
          ) : (
            <KeyboardArrowDownIcon />
          )}
        </IconButton>
      ),
    },
  ];

  // Add prop validation for the `row` object
  tableColumns[2].Cell.propTypes = {
    row: PropTypes.shape({
      original: PropTypes.shape({
        category: PropTypes.string.isRequired,
      }).isRequired,
    }).isRequired,
  };

  // Filter table rows to show only categories that are visible in the pie chart
  const tableRows = selectedChartData
    ? Object.entries(selectedChartData)
        .filter(([category]) => {
          // Check if the category exists in the pie chart data
          const categoryExistsInPieChart =
            expensesPieChartData.some((item) => item.name === category) ||
            earningsPieChartData.some((item) => item.name === category);
          return categoryExistsInPieChart;
        })
        .map(([category, amount]) => ({
          category,
          amount,
        }))
    : [];

  console.log("Table Rows:", tableRows); // Debugging

  // Prepare detailed data for a category
  const getCategoryDetails = (category) => {
    const categoryExpenses = filterDataByAccountId(expenses).filter(
      (expense) => expense.category === category
    );
    const categoryEarnings = filterDataByAccountId(earnings).filter(
      (earning) => earning.category === category
    );

    return [
      ...categoryExpenses.map((expense) => ({
        type: "Expense",
        date: expense.date.toLocaleDateString(), // Format the date
        amount: expense.amount,
        accountId: expense.accountId,
      })),
      ...categoryEarnings.map((earning) => ({
        type: "Earning",
        date: earning.date.toLocaleDateString(), // Format the date
        amount: earning.amount,
        accountId: earning.accountId,
      })),
    ];
  };

  console.log("Category Details for Open Category:", openCategory, getCategoryDetails(openCategory)); // Debugging

  const detailsColumns = [
    { Header: "Type", accessor: "type" },
    { Header: "Date", accessor: "date" },
    { Header: "Amount", accessor: "amount" },
    { Header: "Account ID", accessor: "accountId" },
  ];

  // Get unique Account IDs from expenses and earnings
  const accountIds = [
    ...new Set([...expenses.map((e) => e.accountId), ...earnings.map((e) => e.accountId)]),
  ];

  console.log("Account IDs:", accountIds); // Debugging

  return (
    <DashboardLayout>
      {/* Navbar with reduced horizontal size */}
      <DashboardNavbar />
      {/* Add top margin to ensure content is below the navbar */}
      <MDBox py={8} mt={8}>
        {/* Dropdown Button for Dashboard Level */}
        <MDBox mb={4} display="flex" justifyContent="flex-start" gap={2}>
          <Button
            aria-controls="dashboard-level-menu"
            aria-haspopup="true"
            onClick={handleMenuOpen}
            variant="contained"
            color="primary"
            endIcon={<KeyboardArrowDownIcon />}
          >
            {dashboardLevel}
          </Button>
          <Menu
            id="dashboard-level-menu"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => handleDashboardLevelChange("Organization Level")}>
              Organization Level
            </MenuItem>
            <MenuItem onClick={() => handleDashboardLevelChange("Account Level")}>
              Account Level
            </MenuItem>
          </Menu>

          {/* Dropdown Button for Account ID (visible only in Account Level) */}
          {dashboardLevel === "Account Level" && (
            <>
              <Button
                aria-controls="account-id-menu"
                aria-haspopup="true"
                onClick={handleAccountMenuOpen}
                variant="contained"
                color="secondary"
                sx={{
                  backgroundColor: "#f0f0f0", // Light mode background color
                  color: "#000000", // Light mode text color
                  "&:hover": {
                    backgroundColor: "#d0d0d0", // Light mode hover background color
                  },
                }}
                endIcon={<KeyboardArrowDownIcon />}
              >
                {accountId || "Select Account ID"}
              </Button>
              <Menu
                id="account-id-menu"
                anchorEl={accountAnchorEl}
                open={Boolean(accountAnchorEl)}
                onClose={handleAccountMenuClose}
              >
                {accountIds.map((id) => (
                  <MenuItem key={id} onClick={() => handleAccountIdChange(id)}>
                    {id}
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
        </MDBox>

        <Grid container spacing={3}>
          {/* Pie Chart 1: Expenses */}
          <Grid item xs={12} sm={6} md={3}>
            <PieChart
              title="Expenses by Category"
              description="Category-wise expenses"
              data={expensesPieChartData}
              onClick={() => handleChartClick(expensesByCategory, "expenses")}
              isActive={activeCard === "expenses"}
            />
          </Grid>
          {/* Pie Chart 2: Earnings */}
          <Grid item xs={12} sm={6} md={3}>
            <PieChart
              title="Earnings by Category"
              description="Category-wise earnings"
              data={earningsPieChartData}
              onClick={() => handleChartClick(earningsByCategory, "earnings")}
              isActive={activeCard === "earnings"}
            />
          </Grid>
          {/* Bar Chart 1: Expenses vs Earnings */}
          <Grid item xs={12} sm={6} md={3}>
            <ReportsBarChart
              title="Expenses vs Earnings"
              description="Comparison of expenses and earnings"
              chart={expensesEarningsBarChartData}
              onClick={() => handleChartClick("expensesEarnings", "expensesEarnings")}
              isActive={activeCard === "expensesEarnings"}
              profitLoss={profitLoss}
            />
          </Grid>
          {/* Bar Chart 2: Financial Runway */}
          <Grid item xs={12} sm={6} md={3}>
            <ReportsBarChart
              title="Financial Runway"
              description="Months of runway"
              chart={financialRunwayBarChartData}
              onClick={() => handleChartClick("financialRunway", "financialRunway")}
              isActive={activeCard === "financialRunway"}
              runwayMonths={financialRunway}
            />
          </Grid>
        </Grid>
        {/* Tables to Display Selected Chart Data */}
        <MDBox mt={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {selectedChartData && (
                <DataTable
                  table={{ columns: tableColumns, rows: tableRows }}
                  showTotalEntries={false}
                  isSorted={false}
                  noEndBorder
                  entriesPerPage={false}
                />
              )}
            </Grid>
          </Grid>
        </MDBox>
        {/* Dropdown Tables for Category Details */}
        <MDBox mt={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {openCategory && (
                <DataTable
                  table={{
                    columns: detailsColumns,
                    rows: getCategoryDetails(openCategory),
                  }}
                  showTotalEntries={false}
                  isSorted={false}
                  noEndBorder
                  entriesPerPage={false}
                />
              )}
            </Grid>
          </Grid>
        </MDBox>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Dashboard;