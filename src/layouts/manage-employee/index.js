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
  MenuItem,
} from "@mui/material";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDBadge from "components/MDBadge";
import DataTable from "examples/Tables/DataTable";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer"; // Import the Footer component
import { db } from "./firebase";
import { collection, addDoc, getDocs, doc, updateDoc } from "firebase/firestore";
import { useMaterialUIController } from "context"; // Import the controller for dark mode

const departments = ["HR", "Engineering", "Marketing", "Sales", "Finance"];
const statuses = ["Active", "On Leave", "Resigned", "Terminated"];

const generateEmployeeId = (name) => {
  const prefix = name.substring(0, 3).toUpperCase();
  const randomNumber = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${randomNumber}`;
};

const ManageEmployee = () => {
  const [open, setOpen] = useState(false);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [roles, setRoles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [exitDate, setExitDate] = useState("");
  const [salary, setSalary] = useState("");
  const [status, setStatus] = useState("");
  const [roleId, setRoleId] = useState("");

  // Dark mode state
  const [controller] = useMaterialUIController();
  const { miniSidenav, darkMode } = controller; // Add miniSidenav here

  // Fetch employees and roles
  useEffect(() => {
    const fetchData = async () => {
      const employeesSnapshot = await getDocs(collection(db, "employees"));
      const employeesData = employeesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEmployees(employeesData);

      const rolesSnapshot = await getDocs(collection(db, "roles"));
      const rolesData = rolesSnapshot.docs.map((doc) => ({
        id: doc.id,
        roleId: doc.data().roleId,
      }));
      setRoles(rolesData);
    };

    fetchData();
  }, []);

  // Filter employees based on search query
  const filteredEmployees = employees.filter((employee) =>
    employee.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Employee Component
  const Employee = ({ name, employeeId, email }) => (
    <MDBox display="flex" alignItems="center" lineHeight={1}>
      <MDBox ml={0} lineHeight={1.2}>
        <MDTypography display="block" variant="button" fontWeight="medium">
          {name}
        </MDTypography>
        <MDTypography variant="caption" display="block">
          ID: {employeeId}
        </MDTypography>
        <MDTypography variant="caption" display="block">
          Mail: {email}
        </MDTypography>
      </MDBox>
    </MDBox>
  );

  Employee.propTypes = {
    name: PropTypes.string.isRequired,
    employeeId: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
  };

  // DesignationDept Component
  const DesignationDept = ({ designation, department }) => (
    <MDBox lineHeight={1} textAlign="left">
      <MDTypography display="block" variant="caption" color="text" fontWeight="medium">
        {designation}
      </MDTypography>
      <MDTypography variant="caption">{department}</MDTypography>
    </MDBox>
  );

  DesignationDept.propTypes = {
    designation: PropTypes.string.isRequired,
    department: PropTypes.string.isRequired,
  };

  // StatusBadge Component
  const StatusBadge = ({ status }) => {
    const colorMap = {
      Active: "success",
      "On Leave": "warning",
      Resigned: "error",
      Terminated: "dark",
    };
    return (
      <MDBox ml={-1}>
        <MDBadge
          badgeContent={status}
          color={colorMap[status] || "dark"}
          variant="gradient"
          size="sm"
        />
      </MDBox>
    );
  };

  StatusBadge.propTypes = {
    status: PropTypes.string.isRequired,
  };

  const handleViewDetails = (employee) => {
    setSelectedEmployee(employee);
    setViewDetailsOpen(true);
  };

  const handleEdit = () => {
    const employee = selectedEmployee;
    setEditingEmployee(employee);
    setName(employee.name);
    setEmail(employee.email);
    setPhone(employee.phone);
    setDepartment(employee.department);
    setDesignation(employee.designation);
    setJoiningDate(employee.joiningDate);
    setExitDate(employee.exitDate);
    setSalary(employee.salary);
    setStatus(employee.status);
    setRoleId(employee.roleId);
    setViewDetailsOpen(false);
    setOpen(true);
  };

  const tableData = {
    columns: [
      { Header: "employee", accessor: "employee", width: "30%", align: "left" },
      { Header: "designation & dept", accessor: "designation", align: "left" },
      { Header: "status", accessor: "status", align: "center" },
      { Header: "joined date", accessor: "joined", align: "center" },
      { Header: "actions", accessor: "actions", align: "center" },
    ],
    rows: filteredEmployees.map((employee) => ({
      employee: (
        <Employee name={employee.name} employeeId={employee.employeeId} email={employee.email} />
      ),
      designation: (
        <DesignationDept designation={employee.designation} department={employee.department} />
      ),
      status: <StatusBadge status={employee.status} />,
      joined: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          {employee.joiningDate}
        </MDTypography>
      ),
      actions: (
        <MDBox display="flex" justifyContent="center">
          <Button
            variant="gradient"
            color="info"
            onClick={() => handleViewDetails(employee)}
            sx={{ mb: 2 }}
          >
            View Employee
          </Button>
        </MDBox>
      ),
    })),
  };

  const handleClickOpen = () => {
    setOpen(true);
    resetForm();
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    setConfirmUpdateOpen(true);
  };

  const confirmUpdate = async () => {
    const newEmployee = {
      employeeId: editingEmployee ? editingEmployee.employeeId : generateEmployeeId(name),
      name,
      email,
      phone,
      department,
      designation,
      joiningDate,
      exitDate,
      salary,
      status,
      roleId,
    };

    if (editingEmployee) {
      await updateDoc(doc(db, "employees", editingEmployee.id), newEmployee);
      setEmployees(
        employees.map((emp) => (emp.id === editingEmployee.id ? { ...emp, ...newEmployee } : emp))
      );
    } else {
      const docRef = await addDoc(collection(db, "employees"), newEmployee);
      setEmployees([...employees, { id: docRef.id, ...newEmployee }]);
    }

    setConfirmUpdateOpen(false);
    handleClose();
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setDepartment("");
    setDesignation("");
    setJoiningDate("");
    setExitDate("");
    setSalary("");
    setStatus("");
    setRoleId("");
    setEditingEmployee(null);
  };

  return (
    <Box
      sx={{
        backgroundColor: "white", // Set the entire page background to white
        minHeight: "100vh", // Ensure the page takes full height
      }}
    >
      {/* Add DashboardNavbar */}
      <DashboardNavbar
        absolute
        light={!darkMode} // Adjust navbar icons for dark mode
        isMini={false}
        sx={{
          backgroundColor: darkMode ? "rgba(33, 33, 33, 0.9)" : "rgba(255, 255, 255, 0.9)", // Dark mode background (not pure black)
          backdropFilter: "blur(10px)",
          zIndex: 1100, // Ensure navbar is below sidebar and settings
          padding: "0 16px", // Reduce horizontal size
          minHeight: "60px", // Reduce navbar height
          top: "8px", // Add space from the top
          left: { xs: "0", md: miniSidenav ? "80px" : "260px" }, // Adjust for sidebar
          width: { xs: "100%", md: miniSidenav ? "calc(100% - 80px)" : "calc(100% - 260px)" }, // Adjust for sidebar
        }}
      />

      {/* Main Content */}
      <Box
        p={3}
        sx={{
          marginLeft: { xs: "0", md: "260px" }, // Adjust for sidebar
          marginTop: { xs: "140px", md: "100px" }, // 2cm down from navbar on small screens
          backgroundColor: "white", // Match card background
          minHeight: "calc(100vh - 80px)", // Ensure content takes full height
          paddingTop: { xs: "32px", md: "24px" }, // Add space from the top
          zIndex: 1000, // Ensure content is below navbar
        }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <MDBox
                mx={2}
                mt={-3}
                py={3}
                px={2}
                variant="gradient"
                bgColor={darkMode ? "dark" : "info"}
                borderRadius="lg"
                coloredShadow={darkMode ? "dark" : "info"}
              >
                <MDTypography variant="h6" color={darkMode ? "white" : "black"}>
                  Employee Management
                </MDTypography>
              </MDBox>
              <MDBox pt={3} pb={2} px={2}>
                <Button
                  variant="gradient"
                  color={darkMode ? "dark" : "info"}
                  onClick={handleClickOpen}
                  sx={{ mb: 2 }}
                >
                  Add Employee
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
      </Box>

      {/* Footer */}
      <Box
        sx={{
          marginLeft: { xs: "0", md: "260px" },
          backgroundColor: "white", // Match card background
          zIndex: 1100, // Ensure footer is above sidebar
        }}
      >
        <Footer />
      </Box>

      {/* Employee Details Dialog */}
      <Dialog
        open={viewDetailsOpen}
        onClose={() => setViewDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: darkMode ? "background.default" : "background.paper",
          },
        }}
      >
        <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>Employee Details</DialogTitle>
        <DialogContent>
          {selectedEmployee && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <MDTypography variant="subtitle2" color={darkMode ? "white" : "black"}>
                  Employee ID
                </MDTypography>
                <MDTypography color={darkMode ? "white" : "black"}>
                  {selectedEmployee.employeeId}
                </MDTypography>
              </Grid>
              <Grid item xs={6}>
                <MDTypography variant="subtitle2" color={darkMode ? "white" : "black"}>
                  Name
                </MDTypography>
                <MDTypography color={darkMode ? "white" : "black"}>
                  {selectedEmployee.name}
                </MDTypography>
              </Grid>
              <Grid item xs={6}>
                <MDTypography variant="subtitle2" color={darkMode ? "white" : "black"}>
                  Email
                </MDTypography>
                <MDTypography color={darkMode ? "white" : "black"}>
                  {selectedEmployee.email}
                </MDTypography>
              </Grid>
              <Grid item xs={6}>
                <MDTypography variant="subtitle2" color={darkMode ? "white" : "black"}>
                  Phone
                </MDTypography>
                <MDTypography color={darkMode ? "white" : "black"}>
                  {selectedEmployee.phone}
                </MDTypography>
              </Grid>
              <Grid item xs={6}>
                <MDTypography variant="subtitle2" color={darkMode ? "white" : "black"}>
                  Department
                </MDTypography>
                <MDTypography color={darkMode ? "white" : "black"}>
                  {selectedEmployee.department}
                </MDTypography>
              </Grid>
              <Grid item xs={6}>
                <MDTypography variant="subtitle2" color={darkMode ? "white" : "black"}>
                  Designation
                </MDTypography>
                <MDTypography color={darkMode ? "white" : "black"}>
                  {selectedEmployee.designation}
                </MDTypography>
              </Grid>
              <Grid item xs={6}>
                <MDTypography variant="subtitle2" color={darkMode ? "white" : "black"}>
                  Joining Date
                </MDTypography>
                <MDTypography color={darkMode ? "white" : "black"}>
                  {selectedEmployee.joiningDate}
                </MDTypography>
              </Grid>
              <Grid item xs={6}>
                <MDTypography variant="subtitle2" color={darkMode ? "white" : "black"}>
                  Exit Date
                </MDTypography>
                <MDTypography color={darkMode ? "white" : "black"}>
                  {selectedEmployee.exitDate || "N/A"}
                </MDTypography>
              </Grid>
              <Grid item xs={6}>
                <MDTypography variant="subtitle2" color={darkMode ? "white" : "black"}>
                  Salary
                </MDTypography>
                <MDTypography color={darkMode ? "white" : "black"}>
                  {selectedEmployee.salary}
                </MDTypography>
              </Grid>
              <Grid item xs={6}>
                <MDTypography variant="subtitle2" color={darkMode ? "white" : "black"}>
                  Status
                </MDTypography>
                <MDTypography color={darkMode ? "white" : "black"}>
                  {selectedEmployee.status}
                </MDTypography>
              </Grid>
              <Grid item xs={6}>
                <MDTypography variant="subtitle2" color={darkMode ? "white" : "black"}>
                  Role ID
                </MDTypography>
                <MDTypography color={darkMode ? "white" : "black"}>
                  {selectedEmployee.roleId}
                </MDTypography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDetailsOpen(false)}>Close</Button>
          <Button onClick={handleEdit} color="primary">
            Edit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Employee Form Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: darkMode ? "background.default" : "background.paper",
          },
        }}
      >
        <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>
          {editingEmployee ? "Edit Employee" : "Add Employee"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ input: { color: darkMode ? "white" : "black" } }}
                InputLabelProps={{ style: { color: darkMode ? "white" : "black" } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ input: { color: darkMode ? "white" : "black" } }}
                InputLabelProps={{ style: { color: darkMode ? "white" : "black" } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                sx={{ input: { color: darkMode ? "white" : "black" } }}
                InputLabelProps={{ style: { color: darkMode ? "white" : "black" } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                sx={{ input: { color: darkMode ? "white" : "black" } }}
                InputLabelProps={{ style: { color: darkMode ? "white" : "black" } }}
              >
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Designation"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                sx={{ input: { color: darkMode ? "white" : "black" } }}
                InputLabelProps={{ style: { color: darkMode ? "white" : "black" } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Joining Date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                InputLabelProps={{ shrink: true, style: { color: darkMode ? "white" : "black" } }}
                sx={{ input: { color: darkMode ? "white" : "black" } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Exit Date"
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
                InputLabelProps={{ shrink: true, style: { color: darkMode ? "white" : "black" } }}
                sx={{ input: { color: darkMode ? "white" : "black" } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Salary"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                sx={{ input: { color: darkMode ? "white" : "black" } }}
                InputLabelProps={{ style: { color: darkMode ? "white" : "black" } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                sx={{ input: { color: darkMode ? "white" : "black" } }}
                InputLabelProps={{ style: { color: darkMode ? "white" : "black" } }}
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
                select
                fullWidth
                label="Role ID"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                sx={{ input: { color: darkMode ? "white" : "black" } }}
                InputLabelProps={{ style: { color: darkMode ? "white" : "black" } }}
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.roleId}>
                    {role.roleId}
                  </MenuItem>
                ))}
              </TextField>
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

      <Dialog
        open={confirmUpdateOpen}
        onClose={() => setConfirmUpdateOpen(false)}
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: darkMode ? "background.default" : "background.paper",
          },
        }}
      >
        <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>Confirm Save Changes?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setConfirmUpdateOpen(false)}>Cancel</Button>
          <Button onClick={confirmUpdate} color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageEmployee;