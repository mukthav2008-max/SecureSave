# SecureSave – Where Mathematics Meets Money and Cybersecurity

**SecureSave** is an educational fintech and cybersecurity website designed to demonstrate how fundamental mathematical principles power everyday personal financial decisions and modern digital encryption.

The project features a **C-core mathematical engine** compiled into **WebAssembly (WASM)**, providing safe, high-performance client-side calculations directly in the user's browser without requiring a backend server.

---

## 1. Project Architecture & Technologies

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Core Computation** | **ANSI C** (`src/*.c`) | All core financial, compound interest, and RSA number-theoretic calculations. |
| **Binary Runtime** | **WebAssembly (WASM)** | Executes the compiled C routines natively in the browser at near-native speed. |
| **Compiler Toolchain**| **Emscripten (`emcc`)** | Compiles C source files into WebAssembly bytecode (`.wasm`). |
| **Interface Structure**| **HTML5** (`index.html`) | Semantic, accessible web structure and dashboards. |
| **Visual Design** | **CSS3** (`style.css`) | Modern fintech design using the designated warm ivory and sage green palette. |
| **Client Logic** | **JavaScript** (`script.js`) | Binds UI controls, manages WebAssembly lifecycles, and renders graphs. |
| **Data Visualization**| **Chart.js** | Dynamic doughnut, trajectory line, and comparative bar charts. |
| **Continuous Delivery**| **GitHub Actions** | Automated CI/CD workflow that compiles C with Emscripten and deploys to GitHub Pages. |

---

## 2. Completed File & Folder Structure

```
SecureSave/
├── .github/
│   └── workflows/
│       └── deploy.yml            # Automated GitHub Actions workflow (Emscripten build & deploy)
├── src/                          # Pure C source code modules
│   ├── math_utils.h              # Header for arithmetic, GCD, Modular Inverse, Exponentiation
│   ├── math_utils.c              # Euclidean GCD, Extended GCD, Primality test, Modular Power
│   ├── budget.h                  # Module 1 Header (Budget calculations & validation)
│   ├── budget.c                  # Total expenses, Net savings, Savings rate logic
│   ├── prediction.h              # Module 2 Header (Future savings prediction)
│   ├── prediction.c              # Monthly compounding recurring annuity formula
│   ├── encryption.h              # Module 3 Header (Educational RSA Security System)
│   ├── encryption.c              # RSA Modulus, Euler Totient, Keygen, Encryption & Decryption
│   ├── simulator.h               # Module 4 Header (Financial Decision Simulator)
│   ├── simulator.c               # Scenario comparison, differential savings & gains
│   └── main.c                    # WASM export layer with EMSCRIPTEN_KEEPALIVE declarations
├── tools/                        # Automation & testing utilities
│   ├── build_wasm.py             # Offline WebAssembly bytecode assembler
│   ├── generate_js_loader.py     # Generates wasm/securesave.js with embedded fallback
│   └── test_wasm.js              # Node.js automated test suite verifying all 31 WASM exports
├── wasm/                         # Compiled WebAssembly artifacts
│   ├── securesave.wasm           # Standalone WebAssembly binary module
│   └── securesave.js             # Dual-mode WASM loader & glue code
├── index.html                    # Main responsive web application
├── style.css                     # Modern fintech stylesheet (Warm Ivory, Sage Green, Slate Blue)
├── script.js                     # DOM interaction, WASM bridge, and Chart.js integration
├── build.bat                     # Windows one-click build script
├── Makefile                      # Standard POSIX Makefile for Linux / macOS / CI
└── README.md                     # Comprehensive project documentation
```

---

## 3. Four Core Modules

### Module 1: Smart Budget Tracker
- **Inputs:** Monthly Income, Food, Transportation, Education, Shopping, and Other Expenses.
- **Formulas (C):**
  $$\text{Total Expenses} = \sum_{i=1}^n E_i$$
  $$\text{Savings} = \text{Income} - \text{Total Expenses}$$
  $$\text{Savings Rate} = \left(\frac{\text{Savings}}{\text{Income}}\right) \times 100\%$$
- **Features:** Input validation against negative values and zero income, financial health classification (Deficit, Breaking Even, Moderate, Healthy, Exceptional), and an interactive expense allocation doughnut chart.

### Module 2: Future Savings Predictor
- **Inputs:** Initial Savings Balance ($P_0$), Monthly Contribution ($PMT$), Annual Interest Rate ($r$ in %), and Investment Duration ($t$ months).
- **Assumptions:** Monthly contributions deposited at month-end; interest compounded monthly at rate $i = r / 1200$.
- **Formulas (C):**
  $$FV(t) = P_0 (1 + i)^t + PMT \times \left[ \frac{(1 + i)^t - 1}{i} \right]$$
  $$\text{Total Contributed} = P_0 + (PMT \times t)$$
  $$\text{Interest Earned} = FV(t) - \text{Total Contributed}$$
- **Features:** Milestone comparison cards for **6-month** and **12-month** horizons, plus an interactive trajectory line chart. Results are educational mathematical models.

### Module 3: Mathematical Security System (RSA)
- **Inputs:** Two small prime numbers $p$ and $q$, public exponent $e$, and numeric plaintext message $M$.
- **Step-by-Step Educational Pipeline:**
  1. **Modulus:** $n = p \times q$
  2. **Euler's Totient:** $\phi(n) = (p - 1)(q - 1)$
  3. **Public Exponent Validation:** $1 < e < \phi(n)$ and $\gcd(e, \phi(n)) = 1$
  4. **Private Key Generation:** $d \equiv e^{-1} \pmod{\phi(n)}$ via Extended Euclidean Algorithm
  5. **Encryption:** $C = M^e \pmod n$ via safe binary modular exponentiation
  6. **Decryption:** $M' = C^d \pmod n$
- **Verification:** Automatically verifies $M' = M$ with on-screen mathematical proof.
- **Safety Disclosure:** Uses small primes for instructional clarity. Production banking encryption uses 2048-bit or 4096-bit keys.

### Module 4: Financial Decision Simulator
- **Inputs:** Scenario A (Baseline Income & Expenses) vs. Scenario B (Optimized Income & Expenses).
- **Formulas (C):**
  $$\Delta S = S_B - S_A$$
  $$\text{Percentage Gain} = \left( \frac{S_B - S_A}{S_A} \right) \times 100\%$$
- **Features:** Computes 1-month, 6-month, and 12-month accumulated advantages; displays grouped comparison bar charts; and contextualizes how minor daily spending reductions compound into substantial yearly wealth.

---

## 4. How to Run Locally on Windows

You do **not** need to manually install Emscripten or complex compiler toolchains on your machine. The pre-built WebAssembly binary and offline JS loader are already included in the repository.

### Option A: Local Python Web Server (Recommended)
1. Open PowerShell or Command Prompt in the project folder:
   ```powershell
   cd c:\Users\ADMIN\Documents\muktha\SecureSave
   ```
2. Start a lightweight local HTTP server using Python:
   ```powershell
   python -m http.server 8000
   ```
3. Open your browser and navigate to:
   [http://localhost:8000](http://localhost:8000)

### Option B: Direct File Opening
- Simply double-click `index.html` or right-click &rarr; **Open with** &rarr; **Google Chrome / Microsoft Edge / Firefox**.
- SecureSave includes an in-memory WebAssembly loader fallback that works smoothly even over the local `file:///` protocol!

---

## 5. How to Test the Website

### Automated CLI Test Suite
Run the unit test suite using Node.js to verify all 31 WebAssembly C export functions:
```powershell
node tools/test_wasm.js
```
Expected output:
```text
==========================================
 SecureSave WebAssembly Test Suite 
==========================================
--- Module 1: Smart Budget Tracker ---
  [PASS] Total Expenses Sum (8000+3000+4000+2500+2500): 20000.00
  [PASS] Monthly Savings (30000 - 20000): 10000.00
  [PASS] Savings Rate ((10000 / 30000) * 100): 33.33
  [PASS] Validate Valid Budget
  [PASS] Validate Negative Income
  [PASS] Validate Zero Income
  [PASS] Validate Negative Expense
  [PASS] Financial Status (Healthy 20-50%)
  [PASS] Financial Status (Deficit)

--- Module 2: Future Savings Predictor ---
  [PASS] Future Value (6 Months, 6% p.a.): 22454.78
  [PASS] Total Contributed (6 Months): 22000.00
  [PASS] Estimated Interest (6 Months): 454.78
  [PASS] Future Value (12 Months) > Total Contributed
  [PASS] Total Contributed (12 Months): 34000.00

--- Module 3: Mathematical Security System (RSA) ---
  [PASS] Prime Check for 61
  [PASS] Non-Prime Check for 63
  [PASS] GCD(17, 3120) === 1
  [PASS] RSA Modulus n (61 * 53 = 3233)
  [PASS] Euler Totient phi (60 * 52 = 3120)
  [PASS] e = 17 valid for phi = 3120
  [PASS] RSA Private Key d ((17 * 2753) % 3120 === 1)
  [PASS] Encrypted Cipher != Message
  [PASS] Decrypted Message matches Original (M == M')
  [PASS] RSA Validate All (Valid Params)
  [PASS] RSA Validate All (p is not prime -> code 1)
  [PASS] RSA Validate All (M >= n -> code 5)

--- Module 4: Financial Decision Simulator ---
  [PASS] Scenario A Monthly Savings: 10000.00
  [PASS] Scenario B Monthly Savings: 12000.00
  [PASS] 6-Month Savings Difference: 12000.00
  [PASS] 12-Month Savings Difference: 24000.00
  [PASS] Percentage Improvement in Savings: 20.00%
==========================================
 Summary: 31 PASSED, 0 FAILED 
==========================================
```

### Manual Interactive Checklist
- **Navigation:** Click all navbar links (Dashboard, Budget, Predictor, RSA, Simulator, Math Lab) to verify smooth in-page scrolling.
- **Budget Tracker:** Change income to ₹40,000; verify total expenses, savings, doughnut chart segments, and status feedback change dynamically. Enter ₹0 or negative values to test input validation flags.
- **Savings Predictor:** Drag the duration slider from 3 to 24 months. Verify the line chart updates and that the 6-month & 12-month milestone cards remain accurate.
- **RSA Demonstration:** Click on prime chips (e.g., $p=61, q=53$), choose $e=17$, select message $M=65$ ('A'). Observe step-by-step key calculations and check the "Mathematical Proof Verified" confirmation.
- **Decision Simulator:** Adjust Scenario B expenses from ₹18,000 to ₹16,000; see the 12-month difference expand to +₹48,000 and watch the bar chart update.

---

## 6. How to Push to GitHub & Enable GitHub Pages

Follow these simple steps to publish your project online:

### Step 1: Initialize Git and Commit
```bash
git init
git add .
git commit -m "Initial commit: SecureSave fintech & cryptography educational platform"
```

### Step 2: Connect to your GitHub Repository
Create a new empty repository on [GitHub](https://github.com/new) named `SecureSave`, then run:
```bash
git branch -M main
git remote add origin https://github.com/<YOUR-USERNAME>/SecureSave.git
git push -u origin main
```

### Step 3: Enable GitHub Pages in Repository Settings
1. Open your repository on GitHub.
2. Click **Settings** &rarr; **Pages** (in the left sidebar).
3. Under **Build and deployment** &rarr; **Source**, select **GitHub Actions**.
4. The `.github/workflows/deploy.yml` workflow will automatically trigger, setup the official Emscripten compiler (`emsdk`), compile the C files into WebAssembly, run unit tests, and deploy the website to:
   ```
   https://<YOUR-USERNAME>.github.io/SecureSave/
   ```

---

## 7. Mathematical Foundations Summary

1. **Arithmetic & Summation:** $E_{\text{total}} = \sum E_i$, providing scalar consolidation of outflows.
2. **Percentage Ratios:** $\text{Savings Rate} = (S / I) \times 100\%$, standardizing personal finance performance.
3. **Compound Interest Geometric Sequence:** $FV = P_0(1+i)^t + PMT \frac{(1+i)^t - 1}{i}$, modelling exponential wealth expansion.
4. **Number Theory & Primality:** Primes possess exactly two positive divisors, forming the asymmetric one-way function backbone of RSA.
5. **Euclidean Algorithm for GCD:** Iterative quotient-remainder steps computing $\gcd(a, b) = \gcd(b, a \bmod b)$ in logarithmic time.
6. **Euler's Totient Function $\phi(n)$:** Quantifying the size of the multiplicative group modulo $n$. For $n = pq$, $\phi(pq) = (p-1)(q-1)$.
7. **Extended Euclidean Algorithm:** Solves Bézout's identity $ax + by = \gcd(a, b)$ to locate modular multiplicative inverses.
8. **Euler's Totient Theorem:** $M^{\phi(n)} \equiv 1 \pmod n$, ensuring trapdoor inversion:
   $$M^{ed} \equiv M^{k\phi(n) + 1} \equiv (M^{\phi(n)})^k \cdot M \equiv 1^k \cdot M \equiv M \pmod n$$

