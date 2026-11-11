/**
 * SecureSave - Financial Decision Simulator Header
 * Compares two financial budget scenarios (Scenario A vs Scenario B).
 */

#ifndef SIMULATOR_H
#define SIMULATOR_H

#ifdef __cplusplus
extern "C" {
#endif

/* Calculates monthly savings for a given scenario: income - expenses */
double simulator_monthly_savings(double income, double expenses);

/* Calculates accumulated savings over n months: monthly_savings * months */
double simulator_period_savings(double income, double expenses, int months);

/* Calculates absolute difference between Scenario B and Scenario A over n months */
double simulator_savings_diff(double income_a, double expense_a, double income_b, double expense_b, int months);

/* Calculates percentage improvement in savings from Scenario A to B.
 * Returns percentage (e.g. 50.0 for 50% increase).
 * Returns -999.0 if Scenario A savings is non-positive (mathematically invalid base).
 */
double simulator_improvement_pct(double income_a, double expense_a, double income_b, double expense_b);

/* Validates simulator inputs. Returns 0 if valid, error code otherwise */
int simulator_validate(double income_a, double expense_a, double income_b, double expense_b);

#ifdef __cplusplus
}
#endif

#endif /* SIMULATOR_H */

