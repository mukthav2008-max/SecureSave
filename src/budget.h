/**
 * SecureSave - Budget Tracker Header
 */

#ifndef BUDGET_H
#define BUDGET_H

#ifdef __cplusplus
extern "C" {
#endif

/* Calculates total monthly expenses by summing all categories */
double budget_total_expenses(double food, double transport, double education, double shopping, double other);

/* Calculates monthly savings: income - total_expenses */
double budget_savings(double income, double total_expenses);

/* Calculates savings percentage: (savings / income) * 100 */
double budget_savings_percentage(double income, double savings);

/* Validates input values. Returns 0 if valid, error code otherwise */
int budget_validate(double income, double food, double transport, double education, double shopping, double other);

/* Determines financial health tier based on savings rate */
int budget_status_code(double savings_percentage, double savings);

#ifdef __cplusplus
}
#endif

#endif /* BUDGET_H */
