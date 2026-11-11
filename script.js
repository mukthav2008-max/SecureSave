/**
 * SecureSave - Main Client Application Logic
 * Bridges HTML5 user interface with compiled C WebAssembly modules and Chart.js graphs.
 */

(function () {
    'use strict';

    // Global handles to WebAssembly functions and Chart.js instances
    let wasm = null;
    let budgetChart = null;
    let predictorChart = null;
    let simulatorChart = null;

    // --- Currency Formatting Utility (Indian Rupee / standard comma grouping) ---
    function formatCurrency(val) {
        if (isNaN(val) || val === null || val === undefined) return "₹0";
        const sign = val < 0 ? "-" : "";
        const absVal = Math.abs(val);
        return sign + "₹" + absVal.toLocaleString("en-IN", {
            maximumFractionDigits: 2,
            minimumFractionDigits: val % 1 === 0 ? 0 : 2
        });
    }

    // --- JavaScript Mathematical Mirror (Graceful Fallback if WASM encounters sandbox restrictions) ---
    const jsMathFallback = {
        c_budget_total_expenses: (f, t, ed, s, o) => Math.max(0, f) + Math.max(0, t) + Math.max(0, ed) + Math.max(0, s) + Math.max(0, o),
        c_budget_savings: (inc, exp) => inc - exp,
        c_budget_savings_percentage: (inc, sav) => inc <= 0 ? 0 : (sav / inc) * 100,
        c_budget_validate: (inc, f, t, ed, s, o) => {
            if (inc < 0) return 1;
            if (inc === 0) return 2;
            if (f < 0 || t < 0 || ed < 0 || s < 0 || o < 0) return 3;
            return 0;
        },
        c_budget_status_code: (pct, sav) => {
            if (sav < 0) return -1;
            if (sav === 0 || pct < 1) return 0;
            if (pct < 10) return 1;
            if (pct < 20) return 2;
            if (pct <= 50) return 3;
            return 4;
        },
        c_prediction_future_value: (init, pmt, rate, months) => {
            if (months <= 0) return init;
            let bal = init;
            const mRate = (rate / 100) / 12;
            for (let i = 0; i < months; i++) {
                bal = bal * (1 + mRate) + pmt;
            }
            return bal;
        },
        c_prediction_total_contributed: (init, pmt, months) => init + (pmt * months),
        c_prediction_interest_earned: (init, pmt, rate, months) => {
            const fv = jsMathFallback.c_prediction_future_value(init, pmt, rate, months);
            const cont = jsMathFallback.c_prediction_total_contributed(init, pmt, months);
            return Math.max(0, fv - cont);
        },
        c_prediction_validate: (init, pmt, rate, months) => {
            if (init < 0) return 1;
            if (pmt < 0) return 2;
            if (rate < 0 || rate > 100) return 3;
            if (months <= 0 || months > 600) return 4;
            return 0;
        },
        c_is_prime: (n) => {
            const num = BigInt(n);
            if (num <= 1n) return 0;
            if (num <= 3n) return 1;
            if (num % 2n === 0n || num % 3n === 0n) return 0;
            for (let i = 5n; i * i <= num; i += 6n) {
                if (num % i === 0n || num % (i + 2n) === 0n) return 0;
            }
            return 1;
        },
        c_gcd: (a, b) => {
            let x = BigInt(a);
            let y = BigInt(b);
            while (y !== 0n) {
                const temp = y;
                y = x % y;
                x = temp;
            }
            return x;
        },
        c_rsa_compute_n: (p, q) => BigInt(p) * BigInt(q),
        c_rsa_compute_totient: (p, q) => (BigInt(p) - 1n) * (BigInt(q) - 1n),
        c_rsa_validate_e: (e, phi) => {
            const exp = BigInt(e);
            const tot = BigInt(phi);
            if (exp <= 1n || exp >= tot) return 0;
            return jsMathFallback.c_gcd(exp, tot) === 1n ? 1 : 0;
        },
        c_rsa_compute_d: (e, phi) => {
            let r0 = BigInt(e), r1 = BigInt(phi);
            let s0 = 1n, s1 = 0n;
            while (r1 !== 0n) {
                const q = r0 / r1;
                const tempR = r0 - q * r1; r0 = r1; r1 = tempR;
                const tempS = s0 - q * s1; s0 = s1; s1 = tempS;
            }
            if (r0 !== 1n) return -1n;
            return (s0 % BigInt(phi) + BigInt(phi)) % BigInt(phi);
        },
        c_rsa_encrypt_msg: (m, e, n) => {
            let res = 1n;
            let base = BigInt(m) % BigInt(n);
            let exp = BigInt(e);
            const mod = BigInt(n);
            while (exp > 0n) {
                if (exp & 1n) res = (res * base) % mod;
                base = (base * base) % mod;
                exp >>= 1n;
            }
            return res;
        },
        c_rsa_decrypt_msg: (c, d, n) => jsMathFallback.c_rsa_encrypt_msg(c, d, n),
        c_rsa_validate_all: (p, q, e, m) => {
            if (!jsMathFallback.c_is_prime(p)) return 1;
            if (!jsMathFallback.c_is_prime(q)) return 2;
            if (BigInt(p) === BigInt(q)) return 3;
            const phi = (BigInt(p) - 1n) * (BigInt(q) - 1n);
            if (!jsMathFallback.c_rsa_validate_e(e, phi)) return 4;
            const n = BigInt(p) * BigInt(q);
            if (BigInt(m) < 0n) return 6;
            if (BigInt(m) >= n) return 5;
            return 0;
        },
        c_simulator_monthly_savings: (inc, exp) => inc - exp,
        c_simulator_period_savings: (inc, exp, months) => (inc - exp) * months,
        c_simulator_savings_diff: (ia, ea, ib, eb, months) => ((ib - eb) - (ia - ea)) * months,
        c_simulator_improvement_pct: (ia, ea, ib, eb) => {
            const sa = ia - ea;
            const sb = ib - eb;
            if (sa <= 0) return -999;
            return ((sb - sa) / sa) * 100;
        },
        c_simulator_validate: (ia, ea, ib, eb) => {
            if (ia < 0 || ib < 0) return 1;
            if (ea < 0 || eb < 0) return 2;
            if (ia === 0 || ib === 0) return 3;
            return 0;
        }
    };

    // --- WebAssembly Initialization ---
    async function initWasmEngine() {
        const badge = document.getElementById("wasmStatusBadge");
        const statusText = document.getElementById("wasmStatusText");

        try {
            if (typeof window.SecureSaveWasm !== 'undefined') {
                const exports = await window.SecureSaveWasm.init();
                if (exports && exports.c_budget_total_expenses) {
                    wasm = exports;
                    statusText.textContent = "WebAssembly (C Engine): Active (Compiled C routines executing in browser)";
                    badge.style.backgroundColor = "var(--success-bg)";
                    badge.style.color = "var(--success)";
                    console.info("[SecureSave] Loaded WebAssembly engine successfully.");
                    return;
                }
            }
        } catch (e) {
            console.warn("[SecureSave] WebAssembly failed to instantiate:", e);
        }

        // Fallback to JS mirror if WebAssembly was prevented
        wasm = jsMathFallback;
        statusText.textContent = "C Math Engine: Active (Mirror execution)";
        badge.style.backgroundColor = "var(--warning-bg)";
        badge.style.color = "var(--warning)";
    }

    // --- Helper to safely call BigInt WebAssembly functions ---
    function callWasmBigInt(fn, ...args) {
        if (!fn) return 0n;
        try {
            const bigArgs = args.map(a => BigInt(Math.floor(Number(a))));
            const res = fn(...bigArgs);
            return typeof res === 'bigint' ? res : BigInt(res);
        } catch (err) {
            console.error("WASM BigInt Call error:", err);
            return 0n;
        }
    }

    // =========================================================================
    // MODULE 1: SMART BUDGET TRACKER
    // =========================================================================
    function updateBudgetModule() {
        if (!wasm) return;

        const incomeInput = document.getElementById("budgetIncome");
        const incomeErr = document.getElementById("budgetIncomeError");

        const income = parseFloat(incomeInput.value) || 0;
        const food = parseFloat(document.getElementById("expFood").value) || 0;
        const transport = parseFloat(document.getElementById("expTransport").value) || 0;
        const education = parseFloat(document.getElementById("expEducation").value) || 0;
        const shopping = parseFloat(document.getElementById("expShopping").value) || 0;
        const other = parseFloat(document.getElementById("expOther").value) || 0;

        // Input validation via C
        const validCode = wasm.c_budget_validate(income, food, transport, education, shopping, other);
        if (validCode === 1 || validCode === 2) {
            incomeInput.classList.add("error");
            incomeErr.classList.add("visible");
            incomeErr.textContent = validCode === 1 ? "Income cannot be negative." : "Income must be greater than zero.";
        } else {
            incomeInput.classList.remove("error");
            incomeErr.classList.remove("visible");
        }

        // C arithmetic calls
        const totalExpenses = wasm.c_budget_total_expenses(food, transport, education, shopping, other);
        const savings = wasm.c_budget_savings(income, totalExpenses);
        const savingsRate = wasm.c_budget_savings_percentage(income, savings);
        const statusCode = wasm.c_budget_status_code(savingsRate, savings);

        // Update Module 1 DOM metrics
        document.getElementById("outTotalExpenses").textContent = formatCurrency(totalExpenses);
        const outSavingsElem = document.getElementById("outSavings");
        outSavingsElem.textContent = formatCurrency(savings);
        outSavingsElem.style.color = savings >= 0 ? "var(--headings)" : "var(--danger)";

        document.getElementById("outSavingsRate").textContent = savingsRate.toFixed(1) + "%";

        // Update Homepage Dashboard Overview
        document.getElementById("dashIncome").textContent = formatCurrency(income);
        document.getElementById("dashExpenses").textContent = formatCurrency(totalExpenses);
        const dashSavingsElem = document.getElementById("dashSavings");
        dashSavingsElem.textContent = formatCurrency(savings);
        dashSavingsElem.style.color = savings >= 0 ? "var(--headings)" : "var(--danger)";
        document.getElementById("dashSavingsRate").textContent = savingsRate.toFixed(1) + "%";

        // Financial status feedback banner
        const banner = document.getElementById("budgetStatusBanner");
        const icon = document.getElementById("budgetStatusIcon");
        const title = document.getElementById("budgetStatusTitle");
        const desc = document.getElementById("budgetStatusDesc");
        const dashHealthTier = document.getElementById("dashHealthTier");

        banner.className = "status-banner";

        if (statusCode === -1) {
            banner.classList.add("danger");
            icon.innerHTML = "&#9888;";
            title.textContent = "Budget Deficit Warning";
            desc.textContent = `Your expenses exceed your income by ${formatCurrency(Math.abs(savings))}. Consider reducing discretionary spending like shopping and recreation.`;
            dashHealthTier.textContent = "Health: Critical Deficit";
            dashHealthTier.style.color = "var(--danger)";
        } else if (statusCode === 0) {
            banner.classList.add("warning");
            icon.innerHTML = "&#9888;";
            title.textContent = "Breaking Even";
            desc.textContent = "You are spending all your earnings with virtually zero savings buffer. Build an emergency fund by trimming 10% of flexible costs.";
            dashHealthTier.textContent = "Health: Zero Buffer";
            dashHealthTier.style.color = "var(--warning)";
        } else if (statusCode === 1) {
            banner.classList.add("warning");
            icon.innerHTML = "&#128065;";
            title.textContent = "Modest Savings (< 10%)";
            desc.textContent = `You are saving ${savingsRate.toFixed(1)}% of your income. Financial planners recommend targeting at least 20% for long-term security.`;
            dashHealthTier.textContent = "Health: Low Buffer";
            dashHealthTier.style.color = "var(--warning)";
        } else if (statusCode === 2) {
            banner.classList.add("healthy");
            icon.innerHTML = "&#10004;";
            title.textContent = "Moderate Savings (10% - 20%)";
            desc.textContent = `Solid baseline! You are saving ${savingsRate.toFixed(1)}% (${formatCurrency(savings)}/month). You are on track for steady financial progress.`;
            dashHealthTier.textContent = "Health: Moderate";
            dashHealthTier.style.color = "var(--success)";
        } else if (statusCode === 3) {
            banner.classList.add("healthy");
            icon.innerHTML = "&#10004;";
            title.textContent = "Healthy Savings (20% - 50%)";
            desc.textContent = `Excellent! Saving ${savingsRate.toFixed(1)}% aligns perfectly with the standard 50/30/20 financial rule.`;
            dashHealthTier.textContent = "Health: Healthy (Recommended)";
            dashHealthTier.style.color = "var(--success)";
        } else {
            banner.classList.add("healthy");
            icon.innerHTML = "&#9733;";
            title.textContent = "Exceptional Savings (> 50%)";
            desc.textContent = `Outstanding! You are saving over half of your income (${savingsRate.toFixed(1)}%). Consider investing the surplus for compound growth.`;
            dashHealthTier.textContent = "Health: Exceptional";
            dashHealthTier.style.color = "var(--success)";
        }

        // Update Doughnut Chart
        updateBudgetChart([food, transport, education, shopping, other]);
    }

    function updateBudgetChart(dataValues) {
        const ctx = document.getElementById('budgetChart');
        if (!ctx) return;

        const labels = ['Food & Groceries', 'Transport', 'Education', 'Shopping', 'Other & Utilities'];
        const colors = ['#789184', '#647C87', '#C9A878', '#34463E', '#A4B8AC'];

        if (!budgetChart) {
            budgetChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: dataValues,
                        backgroundColor: colors,
                        borderColor: '#F7F6F1',
                        borderWidth: 2,
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: { family: '-apple-system, sans-serif', size: 11 },
                                boxWidth: 12,
                                padding: 12
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const val = context.parsed;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";
                                    return ` ${context.label}: ${formatCurrency(val)} (${pct}%)`;
                                }
                            }
                        }
                    },
                    cutout: '62%'
                }
            });
        } else {
            budgetChart.data.datasets[0].data = dataValues;
            budgetChart.update();
        }
    }

    // =========================================================================
    // MODULE 2: FUTURE SAVINGS PREDICTOR
    // =========================================================================
    function updatePredictorModule() {
        if (!wasm) return;

        const initial = parseFloat(document.getElementById("predInitial").value) || 0;
        const monthly = parseFloat(document.getElementById("predMonthly").value) || 0;
        const rate = parseFloat(document.getElementById("predRate").value) || 0;
        const months = parseInt(document.getElementById("predMonths").value) || 12;

        document.getElementById("predMonthsLabel").textContent = `${months} Months`;

        // 6-Month Comparison Milestone via C WebAssembly
        const fv6 = wasm.c_prediction_future_value(initial, monthly, rate, 6);
        const cont6 = wasm.c_prediction_total_contributed(initial, monthly, 6);
        const int6 = wasm.c_prediction_interest_earned(initial, monthly, rate, 6);

        document.getElementById("predFV6").textContent = formatCurrency(fv6);
        document.getElementById("predCont6").textContent = formatCurrency(cont6);
        document.getElementById("predInt6").textContent = "+" + formatCurrency(int6);

        // 12-Month Comparison Milestone via C WebAssembly
        const fv12 = wasm.c_prediction_future_value(initial, monthly, rate, 12);
        const cont12 = wasm.c_prediction_total_contributed(initial, monthly, 12);
        const int12 = wasm.c_prediction_interest_earned(initial, monthly, rate, 12);

        document.getElementById("predFV12").textContent = formatCurrency(fv12);
        document.getElementById("predCont12").textContent = formatCurrency(cont12);
        document.getElementById("predInt12").textContent = "+" + formatCurrency(int12);

        // Compute step-by-step month trajectory for chart
        const chartLabels = ["Month 0"];
        const contData = [initial];
        const fvData = [initial];

        for (let m = 1; m <= months; m++) {
            chartLabels.push(`M${m}`);
            contData.push(wasm.c_prediction_total_contributed(initial, monthly, m));
            fvData.push(wasm.c_prediction_future_value(initial, monthly, rate, m));
        }

        updatePredictorChart(chartLabels, contData, fvData);
    }

    function updatePredictorChart(labels, contData, fvData) {
        const ctx = document.getElementById('predictorChart');
        if (!ctx) return;

        if (!predictorChart) {
            predictorChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Total Savings with Interest (FV)',
                            data: fvData,
                            borderColor: '#789184',
                            backgroundColor: 'rgba(120, 145, 132, 0.15)',
                            fill: true,
                            tension: 0.3,
                            borderWidth: 2.5,
                            pointRadius: labels.length > 20 ? 1 : 3
                        },
                        {
                            label: 'Total Principal Contributed',
                            data: contData,
                            borderColor: '#647C87',
                            borderDash: [5, 5],
                            borderWidth: 2,
                            pointRadius: 0,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: { family: '-apple-system, sans-serif', size: 11 },
                                boxWidth: 12
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return ` ${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            ticks: {
                                callback: function (value) {
                                    return '₹' + (value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value);
                                }
                            },
                            grid: {
                                color: 'rgba(213, 215, 208, 0.4)'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        } else {
            predictorChart.data.labels = labels;
            predictorChart.data.datasets[0].data = fvData;
            predictorChart.data.datasets[1].data = contData;
            predictorChart.data.datasets[0].pointRadius = labels.length > 20 ? 1 : 3;
            predictorChart.update();
        }
    }

    // =========================================================================
    // MODULE 3: MATHEMATICAL SECURITY SYSTEM (RSA)
    // =========================================================================
    function updateRsaModule() {
        if (!wasm) return;

        const pVal = parseInt(document.getElementById("rsaP").value) || 0;
        const qVal = parseInt(document.getElementById("rsaQ").value) || 0;
        let eVal = parseInt(document.getElementById("rsaE").value) || 0;
        const mVal = parseInt(document.getElementById("rsaMsg").value) || 0;

        const msgErr = document.getElementById("rsaMsgError");

        // Validate Primes
        const isPPrime = wasm.c_is_prime(pVal) === 1;
        const isQPrime = wasm.c_is_prime(qVal) === 1;
        const distinct = pVal !== qVal;

        if (!isPPrime || !isQPrime || !distinct) {
            document.getElementById("rsaStepN").textContent = `Error: Both p and q must be distinct prime numbers. (p=${pVal} prime: ${isPPrime}, q=${qVal} prime: ${isQPrime})`;
            document.getElementById("rsaStepPhi").textContent = "—";
            document.getElementById("rsaKeyPublic").textContent = "Invalid Key";
            document.getElementById("rsaKeyPrivate").textContent = "Invalid Key";
            document.getElementById("rsaStepEnc").textContent = "—";
            document.getElementById("rsaStepDec").textContent = "—";
            document.getElementById("rsaMatchBanner").style.display = "none";
            return;
        }

        // C WebAssembly: Compute Modulus n & Euler's Totient phi(n)
        const n = callWasmBigInt(wasm.c_rsa_compute_n, pVal, qVal);
        const phi = callWasmBigInt(wasm.c_rsa_compute_totient, pVal, qVal);

        document.getElementById("rsaStepN").innerHTML = `<strong>n = p &times; q</strong> = ${pVal} &times; ${qVal} = <strong>${n.toLocaleString()}</strong>`;
        document.getElementById("rsaStepPhi").innerHTML = `<strong>&phi;(n) = (p - 1) &times; (q - 1)</strong> = (${pVal} - 1) &times; (${qVal} - 1) = <strong>${phi.toLocaleString()}</strong>`;

        // Update suggested e candidates
        updateECandidates(phi);

        // Validate chosen e
        const eValid = wasm.c_rsa_validate_e ? wasm.c_rsa_validate_e(eVal, Number(phi)) === 1 : jsMathFallback.c_rsa_validate_e(eVal, phi) === 1;

        if (!eValid) {
            document.getElementById("rsaStepD").textContent = `Selected e=${eVal} is invalid. It must be coprime to φ(n)=${phi} and 1 < e < φ(n).`;
            document.getElementById("rsaKeyPublic").textContent = `(${eVal}, ${n}) [Invalid e]`;
            document.getElementById("rsaKeyPrivate").textContent = "Undefined";
            document.getElementById("rsaStepEnc").textContent = "—";
            document.getElementById("rsaStepDec").textContent = "—";
            document.getElementById("rsaMatchBanner").style.display = "none";
            return;
        }

        // C WebAssembly: Compute Private Key d using Extended Euclidean Algorithm
        const d = callWasmBigInt(wasm.c_rsa_compute_d, eVal, Number(phi));

        document.getElementById("rsaStepD").innerHTML = `<strong>(e &times; d) &equiv; 1 (mod &phi;(n))</strong> &rarr; (${eVal} &times; ${d}) mod ${phi} = <strong>1</strong>`;
        document.getElementById("rsaKeyPublic").textContent = `(${eVal}, ${n})`;
        document.getElementById("rsaKeyPrivate").textContent = `(${d}, ${n})`;

        // Validate Message M
        if (mVal < 0 || BigInt(mVal) >= n) {
            msgErr.classList.add("visible");
            msgErr.textContent = `Message M (${mVal}) must be non-negative and strictly less than modulus n (${n}).`;
            document.getElementById("rsaStepEnc").textContent = `Error: Message M >= n (${mVal} >= ${n})`;
            document.getElementById("rsaStepDec").textContent = "—";
            document.getElementById("rsaMatchBanner").style.display = "none";
            return;
        } else {
            msgErr.classList.remove("visible");
        }

        // C WebAssembly: Encryption C = M^e mod n
        const cipher = callWasmBigInt(wasm.c_rsa_encrypt_msg, mVal, eVal, Number(n));

        // C WebAssembly: Decryption M' = C^d mod n
        const decrypted = callWasmBigInt(wasm.c_rsa_decrypt_msg, Number(cipher), Number(d), Number(n));

        document.getElementById("rsaStepEnc").innerHTML = `<strong>C = M<sup>e</sup> mod n</strong> = ${mVal}<sup>${eVal}</sup> mod ${n} = <strong>${cipher.toLocaleString()}</strong>`;
        document.getElementById("rsaStepDec").innerHTML = `<strong>M' = C<sup>d</sup> mod n</strong> = ${cipher}<sup>${d}</sup> mod ${n} = <strong>${decrypted.toLocaleString()}</strong>`;

        const matchBanner = document.getElementById("rsaMatchBanner");
        if (decrypted === BigInt(mVal)) {
            matchBanner.style.display = "flex";
            matchBanner.className = "status-banner healthy";
            matchBanner.innerHTML = `<div class="status-banner-icon">&#9989;</div><div><strong>Mathematical Proof Verified:</strong> Decrypted plaintext (${decrypted}) exactly matches the original plaintext message M (${mVal}).</div>`;
        } else {
            matchBanner.style.display = "flex";
            matchBanner.className = "status-banner danger";
            matchBanner.innerHTML = `<div class="status-banner-icon">&#10060;</div><div>Decryption mismatch: Decrypted ${decrypted} != Original ${mVal}.</div>`;
        }
    }

    function updateECandidates(phi) {
        const container = document.getElementById("eCandidatesGroup");
        if (!container) return;

        const currentE = parseInt(document.getElementById("rsaE").value) || 0;
        const candidates = [];
        const potentialPrimes = [3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71];

        for (const p of potentialPrimes) {
            if (p < phi && jsMathFallback.c_gcd(p, phi) === 1n) {
                candidates.push(p);
                if (candidates.length >= 6) break;
            }
        }

        container.innerHTML = "";
        candidates.forEach(cand => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "chip-btn" + (cand === currentE ? " active" : "");
            btn.textContent = `e = ${cand}`;
            btn.onclick = () => {
                document.getElementById("rsaE").value = cand;
                updateRsaModule();
            };
            container.appendChild(btn);
        });
    }

    // =========================================================================
    // MODULE 4: FINANCIAL DECISION SIMULATOR
    // =========================================================================
    function updateSimulatorModule() {
        if (!wasm) return;

        const incA = parseFloat(document.getElementById("simIncA").value) || 0;
        const expA = parseFloat(document.getElementById("simExpA").value) || 0;
        const incB = parseFloat(document.getElementById("simIncB").value) || 0;
        const expB = parseFloat(document.getElementById("simExpB").value) || 0;

        // C calculations
        const savA1 = wasm.c_simulator_monthly_savings(incA, expA);
        const savB1 = wasm.c_simulator_monthly_savings(incB, expB);

        const savA6 = wasm.c_simulator_period_savings(incA, expA, 6);
        const savB6 = wasm.c_simulator_period_savings(incB, expB, 6);

        const savA12 = wasm.c_simulator_period_savings(incA, expA, 12);
        const savB12 = wasm.c_simulator_period_savings(incB, expB, 12);

        const diff1 = wasm.c_simulator_savings_diff(incA, expA, incB, expB, 1);
        const diff6 = wasm.c_simulator_savings_diff(incA, expA, incB, expB, 6);
        const diff12 = wasm.c_simulator_savings_diff(incA, expA, incB, expB, 12);

        const improvementPct = wasm.c_simulator_improvement_pct(incA, expA, incB, expB);

        // Update DOM metrics
        const diff1Elem = document.getElementById("simDiff1");
        diff1Elem.textContent = (diff1 >= 0 ? "+" : "") + formatCurrency(diff1);
        diff1Elem.style.color = diff1 >= 0 ? "var(--success)" : "var(--danger)";

        const diff6Elem = document.getElementById("simDiff6");
        diff6Elem.textContent = (diff6 >= 0 ? "+" : "") + formatCurrency(diff6);
        diff6Elem.style.color = diff6 >= 0 ? "var(--success)" : "var(--danger)";

        const diff12Elem = document.getElementById("simDiff12");
        diff12Elem.textContent = (diff12 >= 0 ? "+" : "") + formatCurrency(diff12);
        diff12Elem.style.color = diff12 >= 0 ? "var(--success)" : "var(--danger)";

        const impElem = document.getElementById("simImprovementPct");
        if (improvementPct === -999.0) {
            impElem.textContent = savB1 > 0 ? "Deficit Eliminated!" : "N/A";
            impElem.style.fontSize = "1.35rem";
        } else {
            impElem.textContent = (improvementPct >= 0 ? "+" : "") + improvementPct.toFixed(1) + "%";
            impElem.style.fontSize = "1.85rem";
        }

        document.getElementById("simMonthlySavingsHighlight").textContent = formatCurrency(Math.abs(diff1));
        document.getElementById("simYearlySavingsHighlight").textContent = formatCurrency(Math.abs(diff12));

        // Update Chart
        updateSimulatorChart([savA1, savA6, savA12], [savB1, savB6, savB12]);
    }

    function updateSimulatorChart(dataA, dataB) {
        const ctx = document.getElementById('simulatorChart');
        if (!ctx) return;

        const labels = ['1 Month', '6 Months', '12 Months (1 Year)'];

        if (!simulatorChart) {
            simulatorChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Scenario A (Baseline)',
                            data: dataA,
                            backgroundColor: '#647C87',
                            borderRadius: 6
                        },
                        {
                            label: 'Scenario B (Optimized)',
                            data: dataB,
                            backgroundColor: '#789184',
                            borderRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: { family: '-apple-system, sans-serif', size: 11 },
                                boxWidth: 12
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return ` ${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            ticks: {
                                callback: function (value) {
                                    return '₹' + (value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value);
                                }
                            },
                            grid: {
                                color: 'rgba(213, 215, 208, 0.4)'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        } else {
            simulatorChart.data.datasets[0].data = dataA;
            simulatorChart.data.datasets[1].data = dataB;
            simulatorChart.update();
        }
    }

    // =========================================================================
    // EVENT LISTENERS & PRESETS
    // =========================================================================
    function setupEventListeners() {
        // Module 1 inputs
        const budgetInputs = document.querySelectorAll("#budgetForm input");
        budgetInputs.forEach(input => {
            input.addEventListener("input", updateBudgetModule);
        });

        // Module 1 presets
        document.getElementById("btnSampleBudget1").addEventListener("click", () => {
            document.getElementById("budgetIncome").value = 20000;
            document.getElementById("expFood").value = 6000;
            document.getElementById("expTransport").value = 2000;
            document.getElementById("expEducation").value = 5000;
            document.getElementById("expShopping").value = 1500;
            document.getElementById("expOther").value = 1500;
            updateBudgetModule();
        });

        document.getElementById("btnSampleBudget2").addEventListener("click", () => {
            document.getElementById("budgetIncome").value = 60000;
            document.getElementById("expFood").value = 14000;
            document.getElementById("expTransport").value = 6000;
            document.getElementById("expEducation").value = 3000;
            document.getElementById("expShopping").value = 7000;
            document.getElementById("expOther").value = 8000;
            updateBudgetModule();
        });

        document.getElementById("btnResetBudget").addEventListener("click", () => {
            document.getElementById("budgetIncome").value = 30000;
            document.getElementById("expFood").value = 8000;
            document.getElementById("expTransport").value = 3000;
            document.getElementById("expEducation").value = 4000;
            document.getElementById("expShopping").value = 2500;
            document.getElementById("expOther").value = 2500;
            updateBudgetModule();
        });

        // Module 2 inputs
        const predInputs = document.querySelectorAll("#predictorForm input");
        predInputs.forEach(input => {
            input.addEventListener("input", updatePredictorModule);
        });

        // Module 3 inputs
        const rsaInputs = document.querySelectorAll("#rsaForm input");
        rsaInputs.forEach(input => {
            input.addEventListener("input", updateRsaModule);
        });

        // Module 4 inputs
        const simInputs = document.querySelectorAll("#simulator input");
        simInputs.forEach(input => {
            input.addEventListener("input", updateSimulatorModule);
        });

        // Module 4 presets
        document.getElementById("btnPresetSim1").addEventListener("click", () => {
            document.getElementById("simIncA").value = 30000;
            document.getElementById("simExpA").value = 20000;
            document.getElementById("simIncB").value = 30000;
            document.getElementById("simExpB").value = 18000;
            updateSimulatorModule();
        });

        document.getElementById("btnPresetSim2").addEventListener("click", () => {
            document.getElementById("simIncA").value = 45000;
            document.getElementById("simExpA").value = 35000;
            document.getElementById("simIncB").value = 45000;
            document.getElementById("simExpB").value = 30000;
            updateSimulatorModule();
        });

        document.getElementById("btnResetSim").addEventListener("click", () => {
            document.getElementById("simIncA").value = 30000;
            document.getElementById("simExpA").value = 20000;
            document.getElementById("simIncB").value = 30000;
            document.getElementById("simExpB").value = 18000;
            updateSimulatorModule();
        });

        // Mobile Nav Toggle
        const toggleBtn = document.getElementById("mobileNavToggle");
        const navLinks = document.getElementById("navLinks");
        if (toggleBtn && navLinks) {
            toggleBtn.addEventListener("click", () => {
                navLinks.classList.toggle("open");
            });

            navLinks.querySelectorAll("a").forEach(link => {
                link.addEventListener("click", () => {
                    navLinks.classList.remove("open");
                });
            });
        }
    }

    // --- Global Helpers attached to window for HTML chip button callbacks ---
    window.setPredictorDuration = function (months) {
        document.getElementById("predMonths").value = months;
        updatePredictorModule();
    };

    window.selectPrimeP = function (p) {
        document.getElementById("rsaP").value = p;
        updateRsaModule();
    };

    window.selectPrimeQ = function (q) {
        document.getElementById("rsaQ").value = q;
        updateRsaModule();
    };

    window.selectMessage = function (msg) {
        document.getElementById("rsaMsg").value = msg;
        updateRsaModule();
    };

    // --- Master Initialization ---
    async function initApp() {
        await initWasmEngine();
        setupEventListeners();

        // Run initial calculations with sample data
        updateBudgetModule();
        updatePredictorModule();
        updateRsaModule();
        updateSimulatorModule();
    }

    // Boot on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
})();

