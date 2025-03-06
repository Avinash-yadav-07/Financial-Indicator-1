import React, { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Box,
} from "@mui/material";
import { db } from "../manage-employee/firebase";
import { collection, addDoc, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import Icon from "@mui/material/Icon";

// Available statuses for accounts
const statuses = ["Active", "Closed"];
// Example industries (adjust as needed)
const industries = ["Technology", "Finance", "Healthcare", "Retail", "Manufacturing"];

const ManageAccount = () => {
  const [open, setOpen] = useState(false);
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [editingAccount, setEditingAccount] = useState(null);

  // Form states
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch projects and clients from Firebase
  const [projectList, setProjectList] = useState([]);
  const [clientList, setClientList] = useState([]);

  // State to hold the total expenses fetched for each account (keyed by accountId)
  const [accountExpenses, setAccountExpenses] = useState({});
  // State to hold the total expenses for each project (keyed by projectId)
  const [projectExpenses, setProjectExpenses] = useState({});

  // Fetch accounts, projects, and clients on component mount
  useEffect(() => {
    const fetchAccounts = async () => {
      const querySnapshot = await getDocs(collection(db, "accounts"));
      setAccounts(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };
    fetchAccounts();

    const fetchProjects = async () => {
      const querySnapshot = await getDocs(collection(db, "projects"));
      setProjectList(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };
    fetchProjects();

    const fetchClients = async () => {
      const querySnapshot = await getDocs(collection(db, "clients"));
      setClientList(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };
    fetchClients();
  }, []);

  // Fetch expenses for each account and project
  useEffect(() => {
    const fetchAllAccountExpenses = async () => {
      const expensesMap = {};
      const projectExpensesMap = {};

      for (const account of accounts) {
        if (account.accountId) {
          // Fetch expenses for the account
          const q = query(collection(db, "expenses"), where("accountId", "==", account.accountId));
          const qs = await getDocs(q);
          let totalAccountExpenses = 0;
          qs.forEach((doc) => {
            const data = doc.data();
            totalAccountExpenses += Number(data.amount) || 0;

            // Fetch expenses for each project within the account
            if (data.projectId) {
              if (!projectExpensesMap[data.projectId]) {
                projectExpensesMap[data.projectId] = 0;
              }
              projectExpensesMap[data.projectId] += Number(data.amount) || 0;
            }
          });
          expensesMap[account.accountId] = totalAccountExpenses;
        }
      }

      setAccountExpenses(expensesMap);
      setProjectExpenses(projectExpensesMap);
    };

    if (accounts.length > 0) {
      fetchAllAccountExpenses();
    }
  }, [accounts]);

  // Open the form dialog
  const handleClickOpen = () => {
    setOpen(true);
    resetForm();
  };

  // Close the form dialog
  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  // Edit an existing account
  const handleEdit = (account) => {
    setEditingAccount(account);
    setName(account.name || "");
    setIndustry(account.industry || "");
    setProjects(account.projects || []);
    setClients(account.clients || []);
    setStatus(account.status || "");
    setNotes(account.notes || "");
    setOpen(true);
  };

  // Submit the form
  const handleSubmit = async () => {
    setConfirmUpdateOpen(true);
  };

  // Confirm and save the account
  const confirmUpdate = async () => {
    const accountId = editingAccount
      ? editingAccount.accountId
      : `ACC-${Math.floor(1000 + Math.random() * 9000)}`;

    // Fetch the total expenses for the account
    const currentExpenses = editingAccount ? accountExpenses[editingAccount.accountId] || 0 : 0;

    // Calculate the total budget from the selected projects
    const totalBudget = projectList
      .filter((project) => projects.includes(project.id))
      .reduce((sum, project) => sum + (Number(project.financialMetrics?.budget) || 0), 0);

    // Calculate revenue as total budget minus total expenses
    const revenue = totalBudget - currentExpenses;

    // Calculate profit margin as (revenue / total budget) * 100
    const profitMargin = totalBudget > 0 ? (revenue / totalBudget) * 100 : 0;

    const newAccount = {
      accountId,
      name,
      industry,
      revenue: revenue.toFixed(2), // Revenue is now calculated as total budget - expenses
      expenses: currentExpenses,
      profitMargin: profitMargin.toFixed(2), // Profit margin is now calculated as (revenue / total budget) * 100
      projects,
      clients,
      status,
      notes,
    };

    if (editingAccount) {
      await updateDoc(doc(db, "accounts", editingAccount.id), newAccount);
      setAccounts(
        accounts.map((acc) => (acc.id === editingAccount.id ? { ...acc, ...newAccount } : acc))
      );
    } else {
      const docRef = await addDoc(collection(db, "accounts"), newAccount);
      setAccounts([...accounts, { id: docRef.id, ...newAccount }]);
    }

    setConfirmUpdateOpen(false);
    handleClose();
  };

  // Reset the form fields
  const resetForm = () => {
    setName("");
    setIndustry("");
    setProjects([]);
    setClients([]);
    setStatus("");
    setNotes("");
    setEditingAccount(null);
  };

  return (
    <MDBox
      p={3}
      sx={{
        marginLeft: "250px",
        marginTop: "30px",
        width: "calc(100% - 250px)",
      }}
    >
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card
            sx={{
              marginTop: "20px",
              borderRadius: "12px",
              overflow: "visible",
            }}
          >
            <MDBox
              mx={0}
              mt={-4.5}
              py={3}
              px={3}
              variant="gradient"
              bgColor="info"
              borderRadius="lg"
              coloredShadow="info"
            >
              <MDTypography variant="h6" color="white">
                Account Management
              </MDTypography>
            </MDBox>
            <MDBox pt={3} pb={2} px={2}>
              <Button variant="gradient" color="info" onClick={handleClickOpen} sx={{ mb: 2 }}>
                Add Accounts
              </Button>
            </MDBox>

            {/* Account Cards Grid */}
            <Grid container spacing={3} sx={{ padding: "16px" }}>
              {accounts.map((account) => {
                const displayedRevenue = account.revenue || 0;

                return (
                  <Grid item xs={12} md={12} key={account.id}>
                    <Card
                      sx={{
                        background: "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
                        borderRadius: "12px",
                        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                        padding: "20px",
                        transition: "0.3s ease-in-out",
                        "&:hover": {
                          boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)",
                          transform: "scale(1.02)",
                        },
                      }}
                    >
                      <CardContent>
                        <Typography variant="h4" sx={{ fontWeight: "bold", color: "#333", mb: 2 }}>
                          {account.name}
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <MDTypography variant="body2" color="textSecondary">
                              <strong>ID:</strong> {account.accountId}
                            </MDTypography>
                            <MDTypography variant="body2" color="textSecondary">
                              <strong>Industry:</strong> {account.industry}
                            </MDTypography>
                            <MDTypography variant="body2" color="textSecondary">
                              <strong>Revenue:</strong> ${displayedRevenue}
                            </MDTypography>
                            <MDTypography variant="body2" color="textSecondary">
                              <strong>Expenses:</strong> ${accountExpenses[account.accountId] || 0}
                            </MDTypography>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <MDTypography variant="body2" color="textSecondary">
                              <strong>Profit Margin:</strong> {account.profitMargin || 0}%
                            </MDTypography>
                            <MDTypography variant="body2" color="textSecondary">
                              <strong>Projects:</strong>{" "}
                              {Array.isArray(account.projects) && account.projects.length > 0
                                ? account.projects
                                    .map((projectId) => {
                                      const project = projectList.find((p) => p.id === projectId);
                                      const projectExpense = projectExpenses[projectId] || 0;
                                      return project
                                        ? `${project.name} ($${projectExpense})`
                                        : projectId;
                                    })
                                    .join(", ")
                                : "No projects assigned"}
                            </MDTypography>
                            <MDTypography variant="body2" color="textSecondary">
                              <strong>Clients:</strong>{" "}
                              {Array.isArray(account.clients) && account.clients.length > 0
                                ? account.clients
                                    .map((clientId) => {
                                      const client = clientList.find((c) => c.id === clientId);
                                      return client ? client.name : clientId;
                                    })
                                    .join(", ")
                                : "No clients assigned"}
                            </MDTypography>
                            <MDTypography variant="body2" color="textSecondary">
                              <strong>Status:</strong>{" "}
                              <Chip
                                label={account.status}
                                sx={{
                                  backgroundColor:
                                    account.status === "Active" ? "#4CAF50" : "#F44336",
                                  color: "#fff",
                                  fontSize: "12px",
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                }}
                              />
                            </MDTypography>
                          </Grid>
                        </Grid>
                      </CardContent>
                      <CardActions sx={{ display: "flex", justifyContent: "flex-end" }}>
                        <MDButton
                          variant="text"
                          onClick={() => handleEdit(account)}
                          sx={{
                            background:
                              "linear-gradient(100% 100% at 100% 0, #5adaff 0, #5468ff 100%)",
                            color: "#000",
                            fontWeight: "bold",
                            borderRadius: "8px",
                            padding: "12px 24px",
                          }}
                        >
                          <Icon fontSize="medium">edit</Icon>&nbsp;Edit
                        </MDButton>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Card>
        </Grid>
      </Grid>

      {/* Account Form Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editingAccount ? "Edit Account" : "Add Account"}</DialogTitle>
        <DialogContent sx={{ py: 2, padding: "30px" }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                {industries.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Projects</InputLabel>
                <Select
                  multiple
                  value={projects}
                  onChange={(e) => setProjects(e.target.value)}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => {
                        const project = projectList.find((p) => p.id === value);
                        return <Chip key={value} label={project ? project.name : value} />;
                      })}
                    </Box>
                  )}
                >
                  {projectList.map((project) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Clients</InputLabel>
                <Select
                  multiple
                  value={clients}
                  onChange={(e) => setClients(e.target.value)}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => {
                        const client = clientList.find((c) => c.id === value);
                        return <Chip key={value} label={client ? client.name : value} />;
                      })}
                    </Box>
                  )}
                >
                  {clientList.map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {statuses.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Update Dialog */}
      <Dialog open={confirmUpdateOpen} onClose={() => setConfirmUpdateOpen(false)}>
        <DialogTitle>Want to save details?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setConfirmUpdateOpen(false)}>Cancel</Button>
          <Button onClick={confirmUpdate} color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </MDBox>
  );
};

export default ManageAccount;
