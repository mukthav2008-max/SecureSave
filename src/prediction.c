/**
 * SecureSave - Future Savings Predictor Implementation
 * 
 * Formula derivation for monthly compounding with recurring contributions:
 * Let P = initial savings, PMT = monthly deposit, r = annual interest rate (in decimal),
 * i = monthly interest rate = r / 12, n = number of months.
 *
 * For each month t = 1..n:
 * Balance accumulates interest, and recurring deposit PMT is added at month end.
 * FV = P * (1 + i)^n + PMT * [ ((1 + i)^n - 1) / i ]
 *
 * If i == 0 (0% interest rate):
 * FV = P + PMT * n
 */

#include "prediction.h"
#include <math.h>

double prediction_future_value(double initial_savings, double monthly_contribution, double annual_rate_pct, int months) {
    if (months <= 0) return initial_savings;
    if (initial_savings < 0.0) initial_savings = 0.0;
    if (monthly_contribution < 0.0) monthly_contribution = 0.0;
    if (annual_rate_pct < 0.0) annual_rate_pct = 0.0;

    double monthly_rate = (annual_rate_pct / 100.0) / 12.0;

    if (monthly_rate <= 1e-9) {
        /* Zero interest rate */
        return initial_savings + (monthly_contribution * (double)months);
    }

    /* Compound interest formula */
    double factor = pow(1.0 + monthly_rate, (double)months);
    double fv_initial = initial_savings * factor;
    double fv_annuity = monthly_contribution * ((factor - 1.0) / monthly_rate);

    return fv_initial + fv_annuity;
}

double prediction_total_contributed(double initial_savings, double monthly_contribution, int months) {
    if (months <= 0) return initial_savings;
    if (initial_savings < 0.0) initial_savings = 0.0;
    if (monthly_contribution < 0.0) monthly_contribution = 0.0;
    return initial_savings + (monthly_contribution * (double)months);
}

double prediction_interest_earned(double initial_savings, double monthly_contribution, double annual_rate_pct, int months) {
    double fv = prediction_future_value(initial_savings, monthly_contribution, annual_rate_pct, months);
    double contributed = prediction_total_contributed(initial_savings, monthly_contribution, months);
    double interest = fv - contributed;
    return interest > 0.0 ? interest : 0.0;
}

int prediction_validate(double initial_savings, double monthly_contribution, double annual_rate_pct, int months) {
    if (initial_savings < 0.0) return 1; /* Negative initial savings */
    if (monthly_contribution < 0.0) return 2; /* Negative monthly deposit */
    if (annual_rate_pct < 0.0 || annual_rate_pct > 100.0) return 3; /* Unreasonable rate */
    if (months <= 0 || months > 600) return 4; /* Invalid month range (1 - 50 years) */
    return 0; /* Valid */
}
