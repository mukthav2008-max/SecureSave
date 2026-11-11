/**
 * SecureSave - Financial Decision Simulator Implementation
 * Compares two financial scenarios and computes compound improvements.
 */

#include "simulator.h"
#include "math_utils.h"

double simulator_monthly_savings(double income, double expenses) {
    return income - expenses;
}

double simulator_period_savings(double income, double expenses, int months) {
    if (months <= 0) return 0.0;
    return (income - expenses) * (double)months;
}

double simulator_savings_diff(double income_a, double expense_a, double income_b, double expense_b, int months) {
    double savings_a = simulator_period_savings(income_a, expense_a, months);
    double savings_b = simulator_period_savings(income_b, expense_b, months);
    return savings_b - savings_a;
}

double simulator_improvement_pct(double income_a, double expense_a, double income_b, double expense_b) {
    double savings_a = simulator_monthly_savings(income_a, expense_a);
    double savings_b = simulator_monthly_savings(income_b, expense_b);

    if (savings_a <= 0.0) {
        /* If Scenario A has zero or negative savings, standard percentage is undefined */
        return -999.0;
    }

    return ((savings_b - savings_a) / savings_a) * 100.0;
}

int simulator_validate(double income_a, double expense_a, double income_b, double expense_b) {
    if (income_a < 0.0 || income_b < 0.0) return 1; /* Negative income */
    if (expense_a < 0.0 || expense_b < 0.0) return 2; /* Negative expense */
    if (income_a == 0.0 || income_b == 0.0) return 3; /* Zero income */
    return 0; /* Valid */
}
