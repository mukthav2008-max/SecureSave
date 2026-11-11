/**
 * SecureSave - Future Savings Predictor Header
 * Compound interest calculations for recurring monthly contributions.
 */

#ifndef PREDICTION_H
#define PREDICTION_H

#ifdef __cplusplus
extern "C" {
#endif

/* Calculates future value after a given number of months with monthly compounding */
double prediction_future_value(double initial_savings, double monthly_contribution, double annual_rate_pct, int months);

/* Calculates total principal deposited: initial_savings + (monthly_contribution * months) */
double prediction_total_contributed(double initial_savings, double monthly_contribution, int months);

/* Calculates total interest earned: future_value - total_contributed */
double prediction_interest_earned(double initial_savings, double monthly_contribution, double annual_rate_pct, int months);

/* Validates prediction inputs. Returns 0 if valid, error code otherwise */
int prediction_validate(double initial_savings, double monthly_contribution, double annual_rate_pct, int months);

#ifdef __cplusplus
}
#endif

#endif /* PREDICTION_H */

