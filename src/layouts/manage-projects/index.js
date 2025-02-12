import React, { useState, useEffect } from "react";
import PropTypes from "prop-types"; // Import PropTypes
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  Typography,
  MenuItem,
  Card,
  Box,
  Autocomplete,
} from "@mui/material";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDProgress from "components/MDProgress";
import DataTable from "examples/Tables/DataTable";
import { db } from "../manage-employee/firebase";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

// Define available statuses for projects
const statuses = ["Ongoing", "Completed", "On Hold"];

// Custom styled button component (used in the table action)
import { styled } from "@mui/material/styles";

const CustomButton = styled("button")({
  padding: "10px 25px",
  border: "unset",
  borderRadius: "15px",
  color: "#212121",
  zIndex: 1,
  background: "#e8e8e8",
  position: "relative",
  fontWeight: 1000,
  fontSize: "17px",
  boxShadow: "4px 8px 19px -3px rgba(0,0,0,0.27)",
  transition: "all 250ms",
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    width: 0,
    borderRadius: "15px",
    backgroundColor: "#212121",
    zIndex: -1,
    boxShadow: "4px 8px 19px -3px rgba(0,0,0,0.27)",
    transition: "all 250ms",
  },
  "&:hover": {
    color: "#e8e8e8",
  },
  "&:hover::before": {
    width: "100%",
  },
});

// The Progress component shows the project's completion percentage with a progress bar
const Progress = ({ value, status }) => {
  const getColor = () => {
    switch (status) {
      case "Completed":
        return "success";
      case "On Hold":
        return "warning";
      default:
        return "info";
    }
  };

  return (
    <MDBox display="flex" alignItems="center">
      <MDTypography variant="caption" color="text" fontWeight="medium">
        {value}%
      </MDTypography>
      <MDBox ml={0.5} width="9rem">
        <MDProgress variant="gradient" color={getColor()} value={value} />
      </MDBox>
    </MDBox>
  );
};

Progress.propTypes = {
  value: PropTypes.number.isRequired,
  status: PropTypes.string.isRequired,
};

// The ProjectInfo component used inside the table for the "project" column.
const ProjectInfo = ({ name, projectId }) => (
  <MDBox display="flex" alignItems="center" lineHeight={1}>
    <MDBox ml={0} lineHeight={1.2}>
      <MDTypography variant="button" fontWeight="medium" display="block">
        {name}
      </MDTypography>
      <MDTypography variant="caption" color="textSecondary" display="block">
        ID: {projectId}
      </MDTypography>
    </MDBox>
  </MDBox>
);

ProjectInfo.propTypes = {
  name: PropTypes.string.isRequired,
  projectId: PropTypes.string.isRequired,
};

const ManageProject = () => {
  // Dialog and state declarations
  const [open, setOpen] = useState(false); // For add/edit form dialog
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false); // For project details dialog
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]); // State for clients
  const [accounts, setAccounts] = useState([]); // State for accounts
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null); // State for selected client
  const [selectedAccount, setSelectedAccount] = useState(null); // State for selected account
  const [invalidClientId, setInvalidClientId] = useState(false);
  const [invalidAccountId, setInvalidAccountId] = useState(false);

  // NEW: State to hold the total expenses for the currently viewed project
  const [projectExpenses, setProjectExpenses] = useState(0);
  // NEW: State to hold the total earnings (revenue) for the currently viewed project
  const [projectRevenue, setProjectRevenue] = useState(0);

  // Form states (removed the "expenses" field)
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [budget, setBudget] = useState("");
  // Removed expenses field since expenses will be fetched dynamically
  const [roi, setRoi] = useState("");
  const [burnRate, setBurnRate] = useState("");
  const [profitMargin, setProfitMargin] = useState("");
  const [revenueGenerated, setRevenueGenerated] = useState("");
  const [expectedRevenue, setExpectedRevenue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("");
  const [description, setDescription] = useState("");
  const [completion, setCompletion] = useState("");

  // Fetch projects, employees, clients, and accounts from Firestore on component mount
  useEffect(() => {
    const fetchProjects = async () => {
      const querySnapshot = await getDocs(collection(db, "projects"));
      setProjects(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };
    const fetchEmployees = async () => {
      const querySnapshot = await getDocs(collection(db, "employees"));
      setEmployees(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };
    const fetchClients = async () => {
      const querySnapshot = await getDocs(collection(db, "clients"));
      setClients(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };
    const fetchAccounts = async () => {
      const querySnapshot = await getDocs(collection(db, "accounts"));
      setAccounts(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };

    fetchProjects();
    fetchEmployees();
    fetchClients();
    fetchAccounts();
  }, []);

  // Whenever a project is selected for viewing details, fetch its expenses from the "expenses" collection
  useEffect(() => {
    const fetchProjectExpenses = async () => {
      if (selectedProject && (selectedProject.projectId || selectedProject.id)) {
        // Use projectId field if it exists; otherwise, fallback to document id.
        const pid = selectedProject.projectId || selectedProject.id;
        const q = query(collection(db, "expenses"), where("projectId", "==", pid));
        const querySnapshot = await getDocs(q);
        let total = 0;
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          total += Number(data.amount) || 0;
        });
        setProjectExpenses(total);
      } else {
        setProjectExpenses(0);
      }
    };
    fetchProjectExpenses();
  }, [selectedProject]);

  // Whenever a project is selected for viewing details, listen to its earnings (revenue) in realtime.
  // Here we query only earnings with category "Project Revenue" and with a referenceId that matches the project.
  useEffect(() => {
    if (selectedProject && (selectedProject.projectId || selectedProject.id)) {
      const pid = selectedProject.projectId || selectedProject.id;
      const earningsQuery = query(
        collection(db, "earnings"),
        where("category", "==", "Project Revenue"),
        where("referenceId", "==", pid)
      );
      const unsubscribe = onSnapshot(earningsQuery, (snapshot) => {
        let totalRevenue = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          totalRevenue += Number(data.amount) || 0;
        });
        setProjectRevenue(totalRevenue);
      });
      return () => unsubscribe();
    } else {
      setProjectRevenue(0);
    }
  }, [selectedProject]);

  // Opens the Add/Edit form dialog and resets form fields
  const handleClickOpen = () => {
    setOpen(true);
    resetForm();
  };

  // Closes the Add/Edit form dialog and resets fields
  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  // When a project row is clicked, re-fetch the project details from Firestore and then open the details dialog
  const handleViewDetails = async (project) => {
    const projectRef = doc(db, "projects", project.id);
    const projectSnap = await getDoc(projectRef);
    if (projectSnap.exists()) {
      setSelectedProject({ id: projectSnap.id, ...projectSnap.data() });
    } else {
      setSelectedProject(project);
    }
    setViewDetailsOpen(true);
  };

  // Called when clicking "Edit" from the details dialog.
  // Populates form fields with the selected project's data.
  const handleEditFromDetails = () => {
    const project = selectedProject;
    setEditingProject(project);
    setName(project.name);
    setTeam(project.team);
    setBudget(project.financialMetrics?.budget || "");
    // Removed expenses field since we are now fetching expenses from Firestore
    setRoi(project.financialMetrics?.roi || "");
    setBurnRate(project.financialMetrics?.burnRate || "");
    setProfitMargin(project.financialMetrics?.profitMargin || "");
    setRevenueGenerated(project.financialMetrics?.revenueGenerated || "");
    setExpectedRevenue(project.financialMetrics?.expectedRevenue || "");
    setStartDate(project.startDate);
    setEndDate(project.endDate);
    setStatus(project.status);
    setDescription(project.description);
    setCompletion(project.completion || "");
    setSelectedEmployees(project.teamMembers || []);
    setSelectedClient(project.clientId); // Set selected client
    setSelectedAccount(project.accountId); // Set selected account
    setViewDetailsOpen(false);
    setOpen(true);
  };

  // Function to handle project update/add submission; shows confirmation dialog
  const handleSubmit = async () => {
    const clientId = selectedClient?.clientId;
    const accountId = selectedAccount?.accountId;

    const clientExists = clientId ? await checkIfClientExists(clientId) : false;
    const accountExists = accountId ? await checkIfAccountExists(accountId) : false;

    if (!clientExists || !accountExists) {
      setInvalidClientId(!clientExists);
      setInvalidAccountId(!accountExists);
      return;
    }

    // Calculate revenue based on budget and (expenses from Firestore will be used, so we rely on the fetched data)
    const calculatedRevenue = calculateRevenue(budget, 0); // Second parameter is 0 because expenses are no longer input
    setRevenueGenerated(calculatedRevenue);

    setConfirmUpdateOpen(true);
  };

  // Check if Client ID exists in Firebase
  const checkIfClientExists = async (clientId) => {
    const querySnapshot = await getDocs(collection(db, "clients"));
    return querySnapshot.docs.some((doc) => doc.data().clientId === clientId);
  };

  // Check if Account ID exists in Firebase
  const checkIfAccountExists = async (accountId) => {
    const querySnapshot = await getDocs(collection(db, "accounts"));
    return querySnapshot.docs.some((doc) => doc.data().accountId === accountId);
  };

  // Calculate revenue based on budget and expenses (expenses input is removed, so only budget is used)
  const calculateRevenue = (budget, expensesInput) => {
    const budgetValue = parseFloat(budget) || 0;
    return budgetValue - expensesInput;
  };

  // Called once the update confirmation is accepted.
  // It adds a new project or updates an existing one in Firestore.
  const confirmUpdate = async () => {
    let projectId;

    // Generate project ID only if it's a new project
    if (!editingProject) {
      projectId = generateUniqueProjectId(name);
    } else {
      projectId = editingProject.projectId; // Use the existing project ID for updates
    }

    const newProject = {
      projectId,
      name,
      accountId: selectedAccount,
      clientId: selectedClient,
      team,
      teamMembers: selectedEmployees,
      financialMetrics: {
        budget,
        roi,
        burnRate,
        profitMargin,
        revenueGenerated,
        expectedRevenue,
      },
      startDate,
      endDate,
      status,
      description,
      completion,
    };

    if (editingProject) {
      await updateDoc(doc(db, "projects", editingProject.id), newProject);
      setProjects(
        projects.map((proj) => (proj.id === editingProject.id ? { ...proj, ...newProject } : proj))
      );
    } else {
      const docRef = await addDoc(collection(db, "projects"), newProject);
      setProjects([...projects, { id: docRef.id, ...newProject }]);
    }

    setConfirmUpdateOpen(false);
    handleClose();
  };

  const generateUniqueProjectId = (name) => {
    let projectId;
    let isUnique = false;

    while (!isUnique) {
      const prefix = name
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase())
        .join("");
      const randomNumber = Math.floor(Math.random() * 1000);
      projectId = `${prefix}-${randomNumber}`;

      // Check if the generated project ID already exists
      isUnique = !projects.some((project) => project.projectId === projectId);
    }

    return projectId;
  };

  // Handles deletion of a project from Firestore
  const handleDelete = async () => {
    await deleteDoc(doc(db, "projects", deleteId));
    setProjects(projects.filter((proj) => proj.id !== deleteId));
    setConfirmDeleteOpen(false);
    setViewDetailsOpen(false);
  };

  // Resets all form fields
  const resetForm = () => {
    setName("");
    setTeam("");
    setBudget("");
    setRoi("");
    setBurnRate("");
    setProfitMargin("");
    setRevenueGenerated("");
    setExpectedRevenue("");
    setStartDate("");
    setEndDate("");
    setStatus("");
    setDescription("");
    setCompletion("");
    setSelectedEmployees([]);
    setEditingProject(null);
    setSelectedClient(null);
    setSelectedAccount(null);
    setInvalidClientId(false);
    setInvalidAccountId(false);
  };

  // Define tableData for the DataTable component.
  // The "action" column now shows a custom button to view project details.
  const tableData = {
    columns: [
      { Header: "project", accessor: "project", width: "30%", align: "left" },
      { Header: "budget", accessor: "budget", align: "left" },
      { Header: "status", accessor: "status", align: "center" },
      { Header: "completion", accessor: "completion", align: "center" },
      { Header: "action", accessor: "action", align: "center" },
    ],
    rows: projects.map((project) => ({
      project: <ProjectInfo name={project.name} projectId={project.projectId} />,
      budget: (
        <MDTypography variant="button" color="text" fontWeight="medium">
          ${project.financialMetrics?.budget || 0}
        </MDTypography>
      ),
      status: (
        <Chip
          label={project.status}
          color={
            project.status === "Completed"
              ? "success"
              : project.status === "On Hold"
              ? "warning"
              : "info"
          }
          size="small"
        />
      ),
      completion: <Progress value={project.completion || 0} status={project.status} />,
      action: (
        <MDBox display="flex" justifyContent="center">
          <Button
            variant="gradient"
            color="info"
            onClick={() => handleViewDetails(project)}
            sx={{ mb: 2 }}
          >
            View Project
          </Button>
        </MDBox>
      ),
    })),
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
              mx={2}
              mt={-3}
              py={3}
              px={2}
              variant="gradient"
              bgColor="info"
              borderRadius="lg"
              coloredShadow="info"
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <MDTypography variant="h6" color="white">
                Projects
              </MDTypography>
            </MDBox>
            <MDBox pt={3} pb={2} px={2}>
              <Button variant="gradient" color="info" onClick={handleClickOpen} sx={{ mb: 2 }}>
                Add Projects
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
      </Grid>

      {/* Project Details Dialog */}
      <Dialog
        open={viewDetailsOpen}
        onClose={() => setViewDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Project Details</DialogTitle>
        <DialogContent>
          {selectedProject && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Project ID</Typography>
                <Typography>{selectedProject.projectId || selectedProject.id || "N/A"}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Name</Typography>
                <Typography>{selectedProject.name || "N/A"}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Account ID</Typography>
                <Typography>
                  {selectedProject.accountId?.accountId || selectedProject.accountId || "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Client ID</Typography>
                <Typography>
                  {selectedProject.clientId?.clientId || selectedProject.clientId || "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Team</Typography>
                <Typography>
                  {Array.isArray(selectedProject.team)
                    ? selectedProject.team.join(", ")
                    : typeof selectedProject.team === "object"
                    ? JSON.stringify(selectedProject.team)
                    : selectedProject.team || "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Budget</Typography>
                <Typography>${selectedProject.financialMetrics?.budget || 0}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Expenses</Typography>
                <Typography>${projectExpenses}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">ROI (%)</Typography>
                <Typography>{selectedProject.financialMetrics?.roi || 0}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Burn Rate</Typography>
                <Typography>{selectedProject.financialMetrics?.burnRate || 0}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Profit Margin (%)</Typography>
                <Typography>{selectedProject.financialMetrics?.profitMargin || 0}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Revenue Generated</Typography>
                <Typography>${projectRevenue}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Expected Revenue</Typography>
                <Typography>{selectedProject.financialMetrics?.expectedRevenue || 0}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Start Date</Typography>
                <Typography>
                  {selectedProject.startDate
                    ? new Date(selectedProject.startDate).toLocaleDateString()
                    : "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">End Date</Typography>
                <Typography>
                  {selectedProject.endDate
                    ? new Date(selectedProject.endDate).toLocaleDateString()
                    : "Ongoing"}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Status</Typography>
                <Typography>{selectedProject.status || "N/A"}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Completion (%)</Typography>
                <Typography>
                  {selectedProject.completion !== undefined
                    ? `${selectedProject.completion}%`
                    : "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Description</Typography>
                <Typography>{selectedProject.description || "No description available"}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDetailsOpen(false)}>Close</Button>
          <Button onClick={handleEditFromDetails} color="primary">
            Edit
          </Button>
          <Button
            onClick={() => {
              setDeleteId(selectedProject.id);
              setConfirmDeleteOpen(true);
            }}
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Project Form Dialog (Add/Edit) */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editingProject ? "Edit Project" : "Add Project"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Project Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                options={clients}
                getOptionLabel={(option) => option.clientId} // Adjust according to your data structure
                value={selectedClient}
                onChange={(event, newValue) => setSelectedClient(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Select Client ID" fullWidth />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                options={accounts}
                getOptionLabel={(option) => option.accountId} // Adjust according to your data structure
                value={selectedAccount}
                onChange={(event, newValue) => setSelectedAccount(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Select Account ID" fullWidth />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={employees}
                getOptionLabel={(option) => option.name}
                value={selectedEmployees}
                onChange={(event, newValue) => setSelectedEmployees(newValue)}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip label={option.name} {...getTagProps({ index })} key={option.id} />
                  ))
                }
                renderInput={(params) => (
                  <TextField {...params} label="Select Employees" fullWidth />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Budget"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </Grid>
            {/* Removed the "Expenses" field from the form */}
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                fullWidth
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {statuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Completion (%)"
                type="number"
                value={completion}
                onChange={(e) => setCompletion(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} color="primary">
            {editingProject ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>Are you sure you want to delete this project?</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Update Dialog */}
      <Dialog open={confirmUpdateOpen} onClose={() => setConfirmUpdateOpen(false)}>
        <DialogTitle>Confirm Submission</DialogTitle>
        <DialogContent>Are you sure you want to save this project?</DialogContent>
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

export default ManageProject;
