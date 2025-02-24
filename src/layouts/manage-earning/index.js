import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  Typography,
  Box,
  InputAdornment,
  MenuItem,
} from "@mui/material";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDBadge from "components/MDBadge";
import DataTable from "examples/Tables/DataTable";
import { db } from "../manage-employee/firebase";
import { collection, onSnapshot, addDoc, Timestamp, getDocs } from "firebase/firestore";
import Autocomplete from "@mui/material/Autocomplete";

// Define the earning categories
const earningCategories = [
  "Project Revenue",
  "Service Revenue",
  "Product Sales",
  "Subscription Revenue",
  "Licensing Revenue",
  "Commission Income",
  "Advertising Revenue",
  "Consulting Fees",
  "Investment Income",
  "Rental or Leasing Income",
];

const ManageEarnings = () => {
  // Data and dialog states
  const [earnings, setEarnings] = useState([]);
  const [selectedEarning, setSelectedEarning] = useState(null);
  const [open, setOpen] = useState(false);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);

  // New form states for category, reference, and account
  const [category, setCategory] = useState("");
  const [reference, setReference] = useState(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(null); // Added for account selection

  // Dropdown data for possible references
  const [clients, setClients] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [projects, setProjects] = useState([]);

  // Real-time data fetching for earnings
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "earnings"), (snapshot) => {
      const earningsData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          date: data.date?.toDate().toLocaleDateString() || "N/A",
        };
      });
      setEarnings(earningsData);
    });
    return () => unsubscribe();
  }, []);

  // Fetch clients, accounts, and projects from Firestore
  useEffect(() => {
    const fetchData = async () => {
      // Fetch clients
      const clientsSnapshot = await getDocs(collection(db, "clients"));
      setClients(clientsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

      // Fetch accounts
      const accountsSnapshot = await getDocs(collection(db, "accounts"));
      setAccounts(accountsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

      // Fetch projects
      const projectsSnapshot = await getDocs(collection(db, "projects"));
      setProjects(projectsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };
    fetchData();
  }, []);

  // Clear any previously selected reference whenever the category changes
  useEffect(() => {
    setReference(null);
  }, [category]);

  // Custom component for displaying details
  const EarningDetails = ({ label, value }) => (
    <MDBox lineHeight={1} textAlign="left">
      <MDTypography display="block" variant="caption" color="text" fontWeight="medium">
        {label}
      </MDTypography>
      <MDTypography variant="caption">{value}</MDTypography>
    </MDBox>
  );

  EarningDetails.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
  };

  // Badge component to display the amount
  const AmountBadge = ({ amount }) => (
    <MDBox ml={-1}>
      <MDBadge
        badgeContent={`$${Number(amount).toFixed(2)}`}
        color="success"
        variant="gradient"
        size="sm"
      />
    </MDBox>
  );

  AmountBadge.propTypes = {
    amount: PropTypes.number.isRequired,
  };

  // Table configuration with added "account" column
  const tableData = {
    columns: [
      { Header: "Earning ID", accessor: "earningId", align: "left" },
      { Header: "Category", accessor: "category", align: "left" },
      { Header: "Reference", accessor: "reference", align: "left" },
      { Header: "Account", accessor: "account", align: "left" }, // Added
      { Header: "Amount", accessor: "amount", align: "center" },
      { Header: "Date", accessor: "date", align: "center" },
      { Header: "Actions", accessor: "actions", align: "center" },
    ],
    rows: earnings.map((earning) => ({
      earningId: (
        <MDTypography variant="caption" fontWeight="medium">
          {earning.earningId || earning.id}
        </MDTypography>
      ),
      category: (
        <MDTypography variant="caption" fontWeight="medium">
          {earning.category}
        </MDTypography>
      ),
      reference: <EarningDetails label="Reference" value={earning.referenceId || "N/A"} />,
      account: (
        <MDTypography variant="caption" fontWeight="medium">
          {earning.accountId ? `${earning.accountId}` : "N/A"}
        </MDTypography>
      ), // Added
      amount: <AmountBadge amount={Number(earning.amount)} />,
      date: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          {earning.date}
        </MDTypography>
      ),
      actions: (
        <MDBox display="flex" justifyContent="center">
          <Button
            variant="gradient"
            color="info"
            onClick={() => {
              setSelectedEarning(earning);
              setViewDetailsOpen(true);
            }}
          >
            View Details
          </Button>
        </MDBox>
      ),
    })),
  };

  // Handle adding a new earning with accountId
  const handleAddEarning = async () => {
    if (!selectedAccount) {
      alert("Please select an account.");
      return;
    }

    const newEarning = {
      earningId: `E-${Math.floor(10000 + Math.random() * 90000)}`,
      category,
      referenceId:
        reference && typeof reference === "object"
          ? reference.projectId || reference.clientId || reference.accountId || reference.name
          : reference || "N/A",
      amount: Number(amount) || 0,
      date: date ? Timestamp.fromDate(new Date(date)) : Timestamp.now(),
      accountId: selectedAccount.accountId, // Use the formatted account ID
    };

    await addDoc(collection(db, "earnings"), newEarning);
    handleClose();
  };

  // Reset form fields on close, including selectedAccount
  const handleClose = () => {
    setOpen(false);
    setCategory("");
    setReference(null);
    setAmount("");
    setDate("");
    setSelectedAccount(null); // Added
  };

  return (
    <Box
      p={3}
      sx={{
        marginLeft: "250px",
        marginTop: "30px",
        width: "calc(100% - 250px)",
      }}
    >
      <Grid item xs={12}>
        <Card
          sx={{
            marginTop: "20px",
            borderRadius: "12px",
            overflow: "visible",
          }}
        >
          <MDBox
            mx={2}
            mt={-3}
            py={3}
            px={2}
            variant="gradient"
            bgColor="info"
            borderRadius="lg"
            coloredShadow="info"
          >
            <MDTypography variant="h6" color="white">
              Earnings Management
            </MDTypography>
          </MDBox>
          <MDBox pt={3} pb={2} px={2}>
            <Button variant="gradient" color="info" onClick={() => setOpen(true)} sx={{ mb: 2 }}>
              Add Earning
            </Button>
            <DataTable
              table={tableData}
              isSorted={false}
              entriesPerPage={false}
              showTotalEntries={false}
              noEndBorder
            />
          </MDBox>
        </Card>
      </Grid>

      {/* Add Earning Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Add New Earning</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Earning Category Selection */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Earning Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {earningCategories.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Render a dynamic Reference field based on the chosen category */}
            {category && (
              <>
                {category === "Project Revenue" && (
                  <Grid item xs={12}>
                    <Autocomplete
                      options={projects}
                      getOptionLabel={(option) => option.projectId || option.name}
                      value={reference}
                      onChange={(e, newValue) => setReference(newValue)}
                      renderInput={(params) => (
                        <TextField {...params} label="Select Project" fullWidth />
                      )}
                    />
                  </Grid>
                )}
                {(category === "Service Revenue" ||
                  category === "Subscription Revenue" ||
                  category === "Licensing Revenue" ||
                  category === "Consulting Fees") && (
                  <Grid item xs={12}>
                    <Autocomplete
                      options={clients}
                      getOptionLabel={(option) => option.clientId || option.name}
                      value={reference}
                      onChange={(e, newValue) => setReference(newValue)}
                      renderInput={(params) => (
                        <TextField {...params} label="Select Client" fullWidth />
                      )}
                    />
                  </Grid>
                )}
                {(category === "Commission Income" ||
                  category === "Advertising Revenue" ||
                  category === "Rental or Leasing Income") && (
                  <Grid item xs={12}>
                    <Autocomplete
                      options={accounts}
                      getOptionLabel={(option) => `${option.accountId}`}
                      value={selectedAccount}
                      onChange={(e, newValue) => setSelectedAccount(newValue)}
                      renderInput={(params) => (
                        <TextField {...params} label="Select Account" fullWidth />
                      )}
                    />
                  </Grid>
                )}
                {(category === "Product Sales" || category === "Investment Income") && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Reference Details"
                      value={reference || ""}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </Grid>
                )}
              </>
            )}

            {/* Account Selection (Mandatory) */}
            <Grid item xs={12}>
              <Autocomplete
                options={accounts}
                getOptionLabel={(option) => `${option.accountId}`}
                value={selectedAccount}
                onChange={(e, newValue) => setSelectedAccount(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Select Account" fullWidth />
                )}
              />
            </Grid>

            {/* Amount and Date fields */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleAddEarning} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog
        open={viewDetailsOpen}
        onClose={() => setViewDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Earning Details</DialogTitle>
        <DialogContent>
          {selectedEarning && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <EarningDetails label="Earning ID" value={selectedEarning.earningId} />
              </Grid>
              <Grid item xs={6}>
                <EarningDetails label="Category" value={selectedEarning.category} />
              </Grid>
              <Grid item xs={6}>
                <EarningDetails label="Reference" value={selectedEarning.referenceId || "N/A"} />
              </Grid>
              <Grid item xs={6}>
                <EarningDetails label="Account ID" value={`${selectedEarning.accountId}`} />{" "}
                {/* Added */}
              </Grid>
              <Grid item xs={6}>
                <EarningDetails
                  label="Amount"
                  value={`$${Number(selectedEarning.amount).toFixed(2)}`}
                />
              </Grid>
              <Grid item xs={6}>
                <EarningDetails label="Date" value={selectedEarning.date} />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageEarnings;
