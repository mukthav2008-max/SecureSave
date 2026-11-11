/**
 * SecureSave - Main WebAssembly Export Interface
 * Provides C endpoints with EMSCRIPTEN_KEEPALIVE for compilation into WebAssembly.
 */

#include "math_utils.h"
#include "budget.h"
#include "prediction.h"
#include "encryption.h"
#include "simulator.h"

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

/* --- Module 1: Budget Tracker --- */

EMSCRIPTEN_KEEPALIVE
double c_budget_total_expenses(double food, double transport, double education, double shopping, double other) {
    return budget_total_expenses(food, transport, education, shopping, other);
}

EMSCRIPTEN_KEEPALIVE
double c_budget_savings(double income, double total_expenses) {
    return budget_savings(income, total_expenses);
}

EMSCRIPTEN_KEEPALIVE
double c_budget_savings_percentage(double income, double savings) {
    return budget_savings_percentage(income, savings);
}

EMSCRIPTEN_KEEPALIVE
int c_budget_validate(double income, double food, double transport, double education, double shopping, double other) {
    return budget_validate(income, food, transport, education, shopping, other);
}

EMSCRIPTEN_KEEPALIVE
int c_budget_status_code(double savings_percentage, double savings) {
    return budget_status_code(savings_percentage, savings);
}

/* --- Module 2: Future Savings Predictor --- */

EMSCRIPTEN_KEEPALIVE
double c_prediction_future_value(double initial_savings, double monthly_contribution, double annual_rate_pct, int months) {
    return prediction_future_value(initial_savings, monthly_contribution, annual_rate_pct, months);
}

EMSCRIPTEN_KEEPALIVE
double c_prediction_total_contributed(double initial_savings, double monthly_contribution, int months) {
    return prediction_total_contributed(initial_savings, monthly_contribution, months);
}

EMSCRIPTEN_KEEPALIVE
double c_prediction_interest_earned(double initial_savings, double monthly_contribution, double annual_rate_pct, int months) {
    return prediction_interest_earned(initial_savings, monthly_contribution, annual_rate_pct, months);
}

EMSCRIPTEN_KEEPALIVE
int c_prediction_validate(double initial_savings, double monthly_contribution, double annual_rate_pct, int months) {
    return prediction_validate(initial_savings, monthly_contribution, annual_rate_pct, months);
}

/* --- Module 3: Mathematical Security System (RSA) --- */

EMSCRIPTEN_KEEPALIVE
int c_is_prime(int64_t n) {
    return is_prime(n);
}

EMSCRIPTEN_KEEPALIVE
int64_t c_gcd(int64_t a, int64_t b) {
    return gcd(a, b);
}

EMSCRIPTEN_KEEPALIVE
int64_t c_rsa_compute_n(int64_t p, int64_t q) {
    return rsa_compute_n(p, q);
}

EMSCRIPTEN_KEEPALIVE
int64_t c_rsa_compute_totient(int64_t p, int64_t q) {
    return rsa_compute_totient(p, q);
}

EMSCRIPTEN_KEEPALIVE
int c_rsa_validate_e(int64_t e, int64_t phi) {
    return rsa_validate_e(e, phi);
}

EMSCRIPTEN_KEEPALIVE
int64_t c_rsa_compute_d(int64_t e, int64_t phi) {
    return rsa_compute_d(e, phi);
}

EMSCRIPTEN_KEEPALIVE
int64_t c_rsa_encrypt_msg(int64_t message, int64_t e, int64_t n) {
    return rsa_encrypt_msg(message, e, n);
}

EMSCRIPTEN_KEEPALIVE
int64_t c_rsa_decrypt_msg(int64_t cipher, int64_t d, int64_t n) {
    return rsa_decrypt_msg(cipher, d, n);
}

EMSCRIPTEN_KEEPALIVE
int c_rsa_validate_all(int64_t p, int64_t q, int64_t e, int64_t message) {
    return rsa_validate_all(p, q, e, message);
}

/* --- Module 4: Financial Decision Simulator --- */

EMSCRIPTEN_KEEPALIVE
double c_simulator_monthly_savings(double income, double expenses) {
    return simulator_monthly_savings(income, expenses);
}

EMSCRIPTEN_KEEPALIVE
double c_simulator_period_savings(double income, double expenses, int months) {
    return simulator_period_savings(income, expenses, months);
}

EMSCRIPTEN_KEEPALIVE
double c_simulator_savings_diff(double income_a, double expense_a, double income_b, double expense_b, int months) {
    return simulator_savings_diff(income_a, expense_a, income_b, expense_b, months);
}

EMSCRIPTEN_KEEPALIVE
double c_simulator_improvement_pct(double income_a, double expense_a, double income_b, double expense_b) {
    return simulator_improvement_pct(income_a, expense_a, income_b, expense_b);
}

EMSCRIPTEN_KEEPALIVE
int c_simulator_validate(double income_a, double expense_a, double income_b, double expense_b) {
    return simulator_validate(income_a, expense_a, income_b, expense_b);
}

/* Main entry point for standalone CLI testing */
int main(void) {
    return 0;
}
