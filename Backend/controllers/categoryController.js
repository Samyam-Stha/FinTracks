const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// GET /api/categories
exports.getCategories = async (req, res) => {
  const userId = req.user.id;
  const { account } = req.query;

  try {
    let categories;

    if (account) {
      categories = await prisma.category.findMany({
        where: { userId, account },
        select: { name: true },
      });
    } else {
      categories = await prisma.category.findMany({
        where: { userId },
        distinct: ["name"],
        select: { name: true },
      });
    }

    res.json(categories.map((cat) => cat.name));
  } catch (err) {
    console.error("Fetch categories error:", err);
    res.status(500).json({ error: "Failed to load categories" });
  }
};

// POST /api/categories
exports.addCategory = async (req, res) => {
  const userId = req.user.id;
  const { name, account } = req.body;

  try {
    await prisma.category.create({
      data: {
        userId,
        name,
        account,
      },
      // Prisma doesn't support ON CONFLICT DO NOTHING directly,
      // so we catch unique constraint violation errors manually if needed
    });
    res.status(201).json({ success: true });
  } catch (err) {
    if (err.code === "P2002") {
      // Unique constraint failed
      return res.status(200).json({ success: true });
    }
    console.error("Insert category error:", err);
    res.status(500).json({ error: "Failed to create category" });
  }
};

// DELETE /api/categories
exports.deleteCategory = async (req, res) => {
  const userId = req.user.id;
  const { name, account } = req.query;

  try {
    // 1. Find or create "No Category"
    let noCategory = await prisma.category.findFirst({
      where: { userId, name: "No Category", account },
    });

    if (!noCategory) {
      noCategory = await prisma.category.create({
        data: { userId, name: "No Category", account },
      });
    }

    // 2. Update all transactions to use "No Category"
    await prisma.transaction.updateMany({
      where: { userId, category: name, account },
      data: { category: "No Category" },
    });

    // 3. Delete the original category
    await prisma.category.deleteMany({
      where: { userId, name, account },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Delete category error:", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
};
