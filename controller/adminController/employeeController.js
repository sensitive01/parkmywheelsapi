const Employee = require("../../models/employeeModel");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// Create Employee
exports.createEmployee = async (req, res) => {
  try {
    const { userName, userMobile, userEmail, userPassword, employeeId, designation, attendance, leaves, status, dob, gender, joiningDate, salary } = req.body;

    if (!userName || !userMobile || !userPassword) {
      return res.status(400).json({ success: false, message: "Name, Mobile, and Password are required" });
    }

    const existingUser = await Employee.findOne({ userMobile });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Mobile number already exists" });
    }

    if (employeeId) {
      const existingEmpId = await Employee.findOne({ employeeId });
      if (existingEmpId) {
        return res.status(400).json({ success: false, message: "Employee ID already exists" });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userPassword, salt); 

    const newEmployee = new Employee({
      uuid: crypto.randomUUID(),
      userName,
      userMobile,
      userEmail,
      userPassword: hashedPassword,
      employeeId: employeeId || "",
      designation: designation || "",
      dob: dob || "",
      gender: gender || "",
      joiningDate: joiningDate || "",
      salary: salary || 0,
      attendance: attendance || 0,
      leaves: leaves || 0,
      status: status || "Active"
    });

    await newEmployee.save();

    res.status(201).json({ success: true, message: "Employee created successfully", data: newEmployee });
  } catch (error) {
    console.error("Error creating employee:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Get all Employees
exports.getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({}).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: employees.length, data: employees });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Get single Employee by ID
exports.getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findOne({ _id: id });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    res.status(200).json(employee);
  } catch (error) {
    console.error("Error fetching employee:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Update Employee
exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { userName, userMobile, userEmail, userPassword, employeeId, designation, attendance, leaves, status, dob, gender, joiningDate, salary } = req.body;

    const employee = await Employee.findOne({ _id: id });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    // Check mobile conflict if changed
    if (userMobile && userMobile !== employee.userMobile) {
      const existingUser = await Employee.findOne({ userMobile });
      if (existingUser) {
        return res.status(400).json({ success: false, message: "Mobile number already in use" });
      }
      employee.userMobile = userMobile;
    }

    // Check employeeId conflict if changed
    if (employeeId && employeeId !== employee.employeeId) {
      const existingEmpId = await Employee.findOne({ employeeId });
      if (existingEmpId) {
        return res.status(400).json({ success: false, message: "Employee ID already in use" });
      }
      employee.employeeId = employeeId;
    } else if (employeeId === "") {
      employee.employeeId = "";
    }

    if (userName) employee.userName = userName;
    if (userEmail) employee.userEmail = userEmail;
    if (userPassword && userPassword.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      employee.userPassword = await bcrypt.hash(userPassword, salt);
    }
    if (designation !== undefined) employee.designation = designation;
    if (dob !== undefined) employee.dob = dob;
    if (gender !== undefined) employee.gender = gender;
    if (joiningDate !== undefined) employee.joiningDate = joiningDate;
    if (salary !== undefined) employee.salary = salary;
    if (attendance !== undefined) employee.attendance = attendance;
    if (leaves !== undefined) employee.leaves = leaves;
    if (status) employee.status = status;

    await employee.save();

    res.status(200).json({ success: true, message: "Employee updated successfully", data: employee });
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Delete Employee
exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    const employee = await Employee.findOneAndDelete({ _id: id });
    
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    res.status(200).json({ success: true, message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
