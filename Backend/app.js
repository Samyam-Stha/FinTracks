const budgetRoutes = require("./routes/budgetRoutes");
const savingsRoutes = require("./routes/savingsRoutes");

app.use("/api/budget", budgetRoutes);
app.use("/api/savings", savingsRoutes); 