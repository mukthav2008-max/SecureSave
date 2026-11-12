/**
 * SecureSave - WebAssembly Unit & Integration Tests
 * Runs tests in Node.js V8 WebAssembly engine to verify all math functions.
 */

const fs = require('fs');
const path = require('path');

async function runTests() {
    console.log("==========================================");
    console.log(" SecureSave WebAssembly Test Suite ");
    console.log("==========================================");

    const wasmPath = path.join(__dirname, '..', 'wasm', 'securesave.wasm');
    const wasmBuffer = fs.readFileSync(wasmPath);
    const { instance } = await WebAssembly.instantiate(wasmBuffer, {});
    const rawExp = instance.exports;
    const exp = new Proxy(rawExp, {
        get(target, prop) {
            if (prop in target) return target[prop];
            if (typeof prop === 'string') {
                if (('_' + prop) in target) return target['_' + prop];
                if (prop.startsWith('_') && prop.slice(1) in target) return target[prop.slice(1)];
            }
            return target[prop];
        }
    });

    let passed = 0;
    let failed = 0;

    function assert(name, condition, details = "") {
        if (condition) {
            console.log(`  [PASS] ${name}`);
            passed++;
        } else {
            console.error(`  [FAIL] ${name} ${details}`);
            failed++;
        }
    }

    function assertClose(name, actual, expected, tol = 1e-4) {
        const diff = Math.abs(actual - expected);
        if (diff <= tol) {
            console.log(`  [PASS] ${name}: ${actual.toFixed(2)} (expected ${expected.toFixed(2)})`);
            passed++;
        } else {
            console.error(`  [FAIL] ${name}: Got ${actual}, expected ${expected} (diff: ${diff})`);
            failed++;
        }
    }

    console.log("\n--- Module 1: Smart Budget Tracker ---");
    const totalExp = exp.c_budget_total_expenses(8000, 3000, 4000, 2500, 2500);
    assertClose("Total Expenses Sum (8000+3000+4000+2500+2500)", totalExp, 20000);

    const savings = exp.c_budget_savings(30000, totalExp);
    assertClose("Monthly Savings (30000 - 20000)", savings, 10000);

    const savingsRate = exp.c_budget_savings_percentage(30000, savings);
    assertClose("Savings Rate ((10000 / 30000) * 100)", savingsRate, 33.3333);

    const validBudget = exp.c_budget_validate(30000, 8000, 3000, 4000, 2500, 2500);
    assert("Validate Valid Budget", validBudget === 0);

    const invalidBudgetNegInc = exp.c_budget_validate(-100, 10, 10, 10, 10, 10);
    assert("Validate Negative Income", invalidBudgetNegInc === 1);

    const invalidBudgetZeroInc = exp.c_budget_validate(0, 10, 10, 10, 10, 10);
    assert("Validate Zero Income", invalidBudgetZeroInc === 2);

    const invalidBudgetNegExp = exp.c_budget_validate(1000, -10, 10, 10, 10, 10);
    assert("Validate Negative Expense", invalidBudgetNegExp === 3);

    const statusHealthy = exp.c_budget_status_code(33.33, 10000);
    assert("Financial Status (Healthy 20-50%)", statusHealthy === 3);

    const statusDeficit = exp.c_budget_status_code(-10, -2000);
    assert("Financial Status (Deficit)", statusDeficit === -1);

    console.log("\n--- Module 2: Future Savings Predictor ---");
    // Initial = 10,000, Monthly = 2,000, Rate = 6%, Duration = 6 months
    // Let's verify compound interest
    // Month 1: 10000 * 1.005 + 2000 = 12050
    // Month 2: 12050 * 1.005 + 2000 = 14110.25
    // Month 3: 14110.25 * 1.005 + 2000 = 16180.80125
    // Month 4: 16180.80125 * 1.005 + 2000 = 18261.70525
    // Month 5: 18261.70525 * 1.005 + 2000 = 20353.01378
    // Month 6: 20353.01378 * 1.005 + 2000 = 22454.7788
    const fv6 = exp.c_prediction_future_value(10000, 2000, 6.0, 6);
    assertClose("Future Value (6 Months, 6% p.a.)", fv6, 22454.7788);

    const cont6 = exp.c_prediction_total_contributed(10000, 2000, 6);
    assertClose("Total Contributed (6 Months)", cont6, 22000);

    const interest6 = exp.c_prediction_interest_earned(10000, 2000, 6.0, 6);
    assertClose("Estimated Interest (6 Months)", interest6, 454.7788);

    // 12 Months
    const fv12 = exp.c_prediction_future_value(10000, 2000, 6.0, 12);
    const cont12 = exp.c_prediction_total_contributed(10000, 2000, 12);
    const interest12 = exp.c_prediction_interest_earned(10000, 2000, 6.0, 12);
    assert("Future Value (12 Months) > Total Contributed", fv12 > cont12);
    assertClose("Total Contributed (12 Months)", cont12, 34000);
    console.log(`    12-month FV: ${fv12.toFixed(2)}, Contributed: ${cont12.toFixed(2)}, Interest: ${interest12.toFixed(2)}`);

    console.log("\n--- Module 3: Mathematical Security System (RSA) ---");
    // Primes p = 61, q = 53
    // n = 61 * 53 = 3233
    // phi = 60 * 52 = 3120
    // e = 17 (gcd(17, 3120) = 1)
    // d = mod_inverse(17, 3120) = 2753
    const isPPrime = exp.c_is_prime(61n);
    assert("Prime Check for 61", isPPrime === 1);

    const isNonPrime = exp.c_is_prime(63n);
    assert("Non-Prime Check for 63", isNonPrime === 0);

    const gcdVal = exp.c_gcd(17n, 3120n);
    assert("GCD(17, 3120) === 1", gcdVal === 1n);

    const n = exp.c_rsa_compute_n(61n, 53n);
    assert("RSA Modulus n (61 * 53 = 3233)", n === 3233n);

    const phi = exp.c_rsa_compute_totient(61n, 53n);
    assert("Euler Totient phi (60 * 52 = 3120)", phi === 3120n);

    const eValid = exp.c_rsa_validate_e(17n, phi);
    assert("e = 17 valid for phi = 3120", eValid === 1);

    const d = exp.c_rsa_compute_d(17n, phi);
    assert("RSA Private Key d ((17 * 2753) % 3120 === 1)", d === 2753n);

    // Test message encryption and decryption
    const message = 65n; // e.g. ASCII 'A' or numeric code
    const cipher = exp.c_rsa_encrypt_msg(message, 17n, n);
    console.log(`    Original message: ${message}, Encrypted Ciphertext: ${cipher}`);
    assert("Encrypted Cipher != Message", cipher !== message && cipher > 0n);

    const decrypted = exp.c_rsa_decrypt_msg(cipher, d, n);
    console.log(`    Decrypted Plaintext: ${decrypted}`);
    assert("Decrypted Message matches Original (M == M')", decrypted === message);

    // Validation checks
    const valAllOk = exp.c_rsa_validate_all(61n, 53n, 17n, 65n);
    assert("RSA Validate All (Valid Params)", valAllOk === 0);

    const valAllNonPrime = exp.c_rsa_validate_all(60n, 53n, 17n, 65n);
    assert("RSA Validate All (p is not prime -> code 1)", valAllNonPrime === 1);

    const valAllMsgTooLarge = exp.c_rsa_validate_all(61n, 53n, 17n, 4000n);
    assert("RSA Validate All (M >= n -> code 5)", valAllMsgTooLarge === 5);

    console.log("\n--- Module 4: Financial Decision Simulator ---");
    // Scenario A: Income 30,000, Expenses 20,000 -> Monthly Savings 10,000
    // Scenario B: Income 30,000, Expenses 18,000 -> Monthly Savings 12,000
    const simSavA = exp.c_simulator_monthly_savings(30000, 20000);
    assertClose("Scenario A Monthly Savings", simSavA, 10000);

    const simSavB = exp.c_simulator_monthly_savings(30000, 18000);
    assertClose("Scenario B Monthly Savings", simSavB, 12000);

    const simDiff6 = exp.c_simulator_savings_diff(30000, 20000, 30000, 18000, 6);
    assertClose("6-Month Savings Difference", simDiff6, 12000);

    const simDiff12 = exp.c_simulator_savings_diff(30000, 20000, 30000, 18000, 12);
    assertClose("12-Month Savings Difference", simDiff12, 24000);

    const simImpPct = exp.c_simulator_improvement_pct(30000, 20000, 30000, 18000);
    assertClose("Percentage Improvement in Savings ((12000-10000)/10000 * 100)", simImpPct, 20.0);

    console.log("==========================================");
    console.log(` Summary: ${passed} PASSED, ${failed} FAILED `);
    console.log("==========================================");

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});

