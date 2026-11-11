# SecureSave – College Project Presentation & Viva Guide

This guide helps you present **SecureSave** to college evaluators, professors, and reviewers with confidence.

---

## 1. 60-Second Elevator Pitch

> *"SecureSave is an educational fintech and cybersecurity platform that illustrates how everyday financial decisions and digital privacy are governed by fundamental mathematics. Rather than using conventional server-side computation or heavy frameworks, SecureSave uses high-performance **ANSI C** compiled into **WebAssembly** to run verified mathematical routines directly inside the browser. It combines four interactive modules: Smart Budgeting, Compound Interest Savings Prediction, an Educational Small-Prime RSA Encryption pipeline, and a Financial Decision Simulator."*

---

## 2. Key Architecture Points to Highlight

1. **Why C and WebAssembly?**
   - **Language Choice:** C is the gold standard for precision, performance, and deterministic mathematical execution without garbage collection overhead.
   - **WebAssembly (WASM):** Enables compiled C code to run natively in modern web browsers at near-native speed inside a memory-safe sandbox.
   - **Separation of Concerns:** 
     - **C Core (`src/*.c`):** Handles 100% of the mathematical algorithms (Euclidean GCD, Euler's totient, Modular inverse, Safe binary exponentiation, Annuity compound interest).
     - **JavaScript (`script.js`):** Acts solely as a bridge and UI controller.
     - **Chart.js & CSS3:** Provide accessible data visualization and modern fintech aesthetics.

2. **Zero Backend Required:**
   - Runs as a secure, static website.
   - Zero storage of real financial information.
   - Fully automated CI/CD using GitHub Actions (`.github/workflows/deploy.yml`) with the official Emscripten compiler (`emsdk`).

---

## 3. Live Demonstration Walkthrough (3-Minute Script)

### Step 1: Dashboard & Smart Budget Tracker (Module 1)
- **What to show:**
  - Point out the active status indicator at the top: `WebAssembly (C Engine): Active`.
  - Enter Monthly Income = ₹30,000, and show categorized expenses totaling ₹20,000.
  - Show how the Net Savings (₹10,000), Savings Rate (33.3%), and Expense Doughnut Chart update in real-time.
- **Math to explain:**
  $$\text{Total} = \sum E_i, \quad S = I - \text{Total}, \quad \text{Rate} = \left(\frac{S}{I}\right) \times 100\%$$
  Point out input validation: demonstrate entering negative numbers or zero income to show how the C validation layer intercepts errors.

### Step 2: Future Savings Predictor (Module 2)
- **What to show:**
  - Set Initial Savings $P_0 = ₹10,000$, Monthly Contribution $PMT = ₹2,000$, Annual Rate $r = 6\%$.
  - Show the 6-Month and 12-Month milestone comparison cards.
  - Drag the horizon slider to 24 or 36 months to show the exponential curve diverging from the linear "Total Contributed" line.
- **Math to explain:**
  $$FV(t) = P_0 (1 + i)^t + PMT \times \left[ \frac{(1 + i)^t - 1}{i} \right], \quad i = \frac{r}{1200}$$
  Explain that this is a recurring annuity with end-of-month deposits and monthly compounding.

### Step 3: Mathematical Security System (RSA) (Module 3)
- **What to show:**
  - Select prime chips $p = 61$ and $q = 53$.
  - Walk the panel through the steps:
    1. Modulus $n = p \times q = 3233$
    2. Euler's Totient $\phi(n) = (p-1)(q-1) = 3120$
    3. Choose public exponent $e = 17$ (coprime to $\phi(n)$)
    4. C computes private key $d = 2753$ using the Extended Euclidean Algorithm
  - Select message $M = 65$ (ASCII 'A'). Show encrypted ciphertext $C = 2790$ and decrypted result $M' = 65$.
  - Highlight the green verification banner: `Mathematical Proof Verified: M' = M`.
- **Math to explain:**
  Euler's Totient Theorem: $M^{ed} \equiv M \pmod n$.
  Emphasize the security disclaimer: small numbers are used strictly for instructional transparency; real banking RSA uses 2048-bit or 4096-bit primes.

### Step 4: Financial Decision Simulator (Module 4)
- **What to show:**
  - Compare Scenario A (Spend ₹20,000) vs Scenario B (Spend ₹18,000).
  - Point out that a small ₹2,000/month reduction leads to ₹24,000 extra savings per year (+20% savings improvement).
  - Show the comparative grouped bar chart comparing 1-month, 6-month, and 12-month outcomes.

---

## 4. Likely Viva / Oral Exam Questions & Answers

### Q1: Why did you compile C to WebAssembly instead of writing the math in JavaScript?
> **Answer:** *"Writing the algorithms in C provides strong numeric typing (such as 64-bit integer modular arithmetic for RSA), zero runtime garbage collection pauses, and platform independence. WebAssembly allows us to run compiled C bytecode directly in any modern browser at near-native speed, bridging systems programming with modern web interfaces."*

### Q2: What is Euler's Totient Function and why is it crucial in RSA?
> **Answer:** *"Euler's Totient Function $\phi(n)$ counts how many integers up to $n$ are coprime to $n$. In RSA, because $n = p \times q$ where $p$ and $q$ are prime, $\phi(n) = (p-1)(q-1)$. It is crucial because Euler's Totient Theorem states that $a^{\phi(n)} \equiv 1 \pmod n$. This allows us to select $e$ and $d$ such that $e \times d \equiv 1 \pmod{\phi(n)}$, guaranteeing that decrypting ciphertext recovers the original message: $(M^e)^d = M^{ed} \equiv M \pmod n$."*

### Q3: How is the Extended Euclidean Algorithm used in your project?
> **Answer:** *"The standard Euclidean algorithm finds the Greatest Common Divisor $\gcd(a, b)$. The Extended Euclidean Algorithm also computes integers $x$ and $y$ satisfying Bézout's identity: $a \cdot x + b \cdot y = \gcd(a, b)$. In RSA, when $\gcd(e, \phi(n)) = 1$, the Extended Euclidean algorithm solves $e \cdot d + \phi(n) \cdot y = 1$, which gives the modular inverse $d \equiv e^{-1} \pmod{\phi(n)}$."*

### Q4: How is compound interest calculated for recurring monthly deposits?
> **Answer:** *"Standard compound interest models a lump sum $P(1+i)^t$. However, when a saver contributes $PMT$ each month, the contributions form a finite geometric series: $PMT \sum_{k=0}^{t-1} (1+i)^k$. Using the geometric series sum formula $\frac{(1+i)^t - 1}{i}$, the total future value becomes $FV = P(1+i)^t + PMT \frac{(1+i)^t - 1}{i}$."*

### Q5: Why is your RSA demo not suitable for actual banking passwords?
> **Answer:** *"Our demo uses small primes ($p, q < 100$) so the arithmetic steps can be inspected and understood by students. With small numbers, any computer can factor $n = p \times q$ in microseconds using trial division. Real banking systems use 2048-bit or 4096-bit primes (over 600 digits), where integer factorization would require billions of years on modern supercomputers."*
