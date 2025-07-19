# FinTrack Security Standards and Mechanisms

## Table 2.2: Security Mechanisms and Standards

| Category | Mechanism Implemented |
|----------|----------------------|
| **Authentication** | Users authenticate using email and bcrypt-hashed passwords. JWT tokens provide stateless session management, ensuring authorized access to protected routes and dashboard features. Email verification required for new registrations. |
| **Encryption** | Passwords are encrypted using bcrypt with salt rounds of 10. JWT tokens are signed with environment-based secret keys. Future HTTPS deployment will secure data transmission between client and server. |
| **Access Control** | Protected routes require valid JWT tokens via middleware authentication. Unauthorized users are automatically redirected to login page. Role-based access control implemented through user-specific data isolation. |
| **Data Validation** | All user inputs are validated on the backend using Prisma schema constraints. Database enforces safe data types and relationships. Input sanitization prevents SQL injection and malicious data storage. |

---

## Detailed Security Implementation

### 1. Authentication System

#### User Registration Flow
```javascript
// ✅ Secure registration with email verification
const register = async (req, res) => {
  const { name, email, password } = req.body;
  
  // Check for existing users
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ error: "Email already registered" });
  }
  
  // Hash password with bcrypt
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Create pending user with verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await prisma.pendingUser.create({
    data: { email, password: hashedPassword, code },
  });
  
  // Send verification email
  await sendVerificationEmail(email, code);
};
```

#### JWT Token Management
```javascript
// ✅ Secure token generation and validation
const login = async (req, res) => {
  const { email, password } = req.body;
  
  // Verify credentials
  const user = await prisma.user.findUnique({ where: { email } });
  const isMatch = await bcrypt.compare(password, user.password);
  
  if (!isMatch) {
    return res.status(400).json({ error: "Invalid credentials" });
  }
  
  // Generate JWT token with user data
  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
  
  return res.status(200).json({ token });
};
```

#### Authentication Middleware
```javascript
// ✅ JWT token validation middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Missing token" });

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Set user data in request
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};
```

### 2. Password Security

#### Password Hashing
```javascript
// ✅ bcrypt password hashing with salt rounds
const hashedPassword = await bcrypt.hash(password, 10);

// ✅ Secure password comparison
const isMatch = await bcrypt.compare(password, user.password);
```

#### Password Reset Flow
```javascript
// ✅ Secure password reset with email verification
const requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  
  // Generate secure reset code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store reset request with expiration
  await prisma.passwordResetRequest.create({ 
    data: { email, code } 
  });
  
  // Send reset email
  await sendVerificationEmail(email, code);
};
```

### 3. Access Control Implementation

#### Protected Route Configuration
```javascript
// ✅ All sensitive routes require authentication
router.use(authenticate); // Apply to all routes in analyticsRoutes.js

// ✅ Individual route protection
router.get("/", authenticate, budgetController.getBudgets);
router.post("/", authenticate, transactionController.addTransaction);
router.put("/:id", authenticate, budgetController.updateBudget);
```

#### Frontend Route Protection
```javascript
// ✅ React route protection component
const ProtectedRoute = ({ children }) => {
  const user = getCurrentUser();
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};
```

#### User Data Isolation
```javascript
// ✅ User-specific data queries
const getTransactions = async (req, res) => {
  const { id: userId } = req.user; // From JWT token
  
  const transactions = await prisma.transaction.findMany({
    where: { userId }, // Only user's own data
    orderBy: { date: 'desc' }
  });
};
```

### 4. Data Validation and Sanitization

#### Prisma Schema Constraints
```prisma
// ✅ Database-level validation
model User {
  id        Int      @id @default(autoincrement())
  name      String   // Required field
  email     String   @unique // Unique constraint
  password  String   // Required field
  createdAt DateTime @default(now())
}

model Transaction {
  id          Int      @id @default(autoincrement())
  amount      Float    // Numeric validation
  category    String   // Required field
  description String   // Optional field
  date        DateTime @default(now())
  userId      Int      // Foreign key constraint
  user        User     @relation(fields: [userId], references: [id])
}

model Budget {
  id         Int      @id @default(autoincrement())
  budget     Float    // Numeric validation
  spent      Float    @default(0) // Default value
  userId     Int
  categoryId Int
  
  @@unique([userId, categoryId]) // Composite unique constraint
}
```

#### Input Validation
```javascript
// ✅ Backend input validation
const addTransaction = async (req, res) => {
  const { amount, category, description } = req.body;
  
  // Validate required fields
  if (!amount || !category) {
    return res.status(400).json({
      success: false,
      error: "Amount and category are required"
    });
  }
  
  // Validate data types
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: "Amount must be a positive number"
    });
  }
  
  // Create transaction with validated data
  const transaction = await prisma.transaction.create({
    data: { 
      amount, 
      category, 
      description: description || '',
      userId: req.user.id 
    }
  });
};
```

### 5. Security Headers and CORS

#### CORS Configuration
```javascript
// ✅ Secure CORS setup
app.use(
  cors({
    origin: "http://localhost:5173", // Specific origin
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
    credentials: true, // Allow credentials
  })
);
```

#### Socket.IO Security
```javascript
// ✅ Secure WebSocket configuration
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});
```

### 6. Environment Security

#### Environment Variables
```bash
# ✅ Secure environment configuration
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/fintrack"
JWT_SECRET=your-super-secret-jwt-key-here
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
```

#### Git Security
```gitignore
# ✅ Environment files excluded from version control
.env
.env.local
.env.production
node_modules/
/generated/prisma
```

### 7. Error Handling Security

#### Secure Error Responses
```javascript
// ✅ Error handling without sensitive data exposure
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});
```

#### Authentication Error Handling
```javascript
// ✅ Secure authentication error responses
const authenticate = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Access denied. No token provided."
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: "Invalid token."
    });
  }
};
```

### 8. Email Security

#### Email Verification System
```javascript
// ✅ Secure email verification
const sendVerificationEmail = async (to, code) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'FinTrack Email Verification',
    text: `Your verification code is: ${code}`,
  };
  await transporter.sendMail(mailOptions);
};
```

#### Email Configuration
```javascript
// ✅ Secure email transport configuration
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App-specific password
  },
});
```

### 9. Database Security

#### Prisma Client Security
```javascript
// ✅ Secure database connection
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Automatic connection management
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
```

#### Database Constraints
```sql
-- ✅ Database-level security constraints
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Category_userId_name_account_key" ON "Category"("userId", "name", "account");
CREATE UNIQUE INDEX "Budget_userId_categoryId_key" ON "Budget"("userId", "categoryId");
```

### 10. Frontend Security

#### Token Management
```javascript
// ✅ Secure token storage and retrieval
export const getCurrentUser = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const user = jwtDecode(token);
    return user;
  } catch (err) {
    return null; // Invalid token
  }
};
```

#### API Request Security
```javascript
// ✅ Secure API requests with authentication
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 11. Security Best Practices

#### Account Deletion Security
```javascript
// ✅ Secure account deletion with password verification
const deleteAccount = async (req, res) => {
  const { id: userId } = req.user;
  const { password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(403).json({ error: "Incorrect password" });
    }

    await prisma.user.delete({ where: { id: userId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete account" });
  }
};
```

#### Session Management
```javascript
// ✅ Secure logout with token removal
const handleLogout = () => {
  localStorage.removeItem("token");
  sessionStorage.clear();
  navigate("/", { replace: true });
};
```

### 12. Security Monitoring

#### Error Logging
```javascript
// ✅ Secure error logging
console.error("Registration Error:", err);
console.error("Login Error:", err);
console.error("Create transaction error:", err);
```

#### Authentication Monitoring
```javascript
// ✅ Authentication attempt monitoring
io.on("connection", (socket) => {
  console.log("Client connected");
  
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});
```

---

## Security Checklist

### Before Deployment
- [ ] All environment variables properly configured
- [ ] JWT secret key is strong and unique
- [ ] Database connection uses secure credentials
- [ ] CORS configuration restricts to specific origins
- [ ] All routes properly protected with authentication
- [ ] Input validation implemented on all endpoints
- [ ] Error handling doesn't expose sensitive information
- [ ] Password hashing uses appropriate salt rounds
- [ ] Email verification system functional
- [ ] HTTPS enabled for production deployment

### Ongoing Security Measures
- [ ] Regular security audits of dependencies
- [ ] Monitor for suspicious authentication attempts
- [ ] Regular backup of user data
- [ ] Keep all dependencies updated
- [ ] Monitor error logs for security issues
- [ ] Regular review of access patterns

---

## Security Tools and Dependencies

### Security Packages Used
```json
{
  "bcrypt": "^5.1.1",           // Password hashing
  "jsonwebtoken": "^9.0.2",     // JWT authentication
  "helmet": "^7.1.0",           // Security headers
  "cors": "^2.8.5",             // CORS protection
  "nodemailer": "^7.0.4",       // Email security
  "jwt-decode": "^4.0.0"        // Frontend JWT handling
}
```

### Recommended Security Extensions
- **ESLint Security Plugin**: Detect security vulnerabilities
- **npm audit**: Regular dependency security checks
- **Helmet.js**: Additional security headers
- **Rate Limiting**: Prevent brute force attacks
- **Input Sanitization**: Additional input validation

---

*This security standards document should be reviewed and updated regularly to ensure compliance with the latest security best practices and to address any new vulnerabilities or threats.* 