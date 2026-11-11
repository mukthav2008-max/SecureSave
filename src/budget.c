/**
 * SecureSave - Budget Tracker Implementation
 * Performs core arithmetic for expense tracking and savings rate.
 */

#include "budget.h"

double budget_total_expenses(double food, double transport, double education, double shopping, double other) {
    if (food < 0.0) food = 0.0;
    if (transport < 0.0) transport = 0.0;
    if (education < 0.0) education = 0.0;
    if (shopping < 0.0) shopping = 0.0;
    if (other < 0.0) other = 0.0;
    return food + transport + education + shopping + other;
}

double budget_savings(double income, double total_expenses) {
    return income - total_expenses;
}

double budget_savings_percentage(double income, double savings) {
    if (income <= 0.0) {
        return 0.0;
    }
    return (savings / income) * 100.0;
}

int budget_validate(double income, double food, double transport, double education, double shopping, double other) {
    if (income < 0.0) return 1; /* Negative income */
    if (income == 0.0) return 2; /* Zero income */
    if (food < 0.0 || transport < 0.0 || education < 0.0 || shopping < 0.0 || other < 0.0) {
        return 3; /* Negative expense category */
    }
    return 0; /* Valid */
}

int budget_status_code(double savings_percentage, double savings) {
    if (savings < 0.0) {
        return -1; /* Deficit */
    }
    if (savings == 0.0 || savings_percentage < 1.0) {
        return 0;  /* Breaking even */
    }
    if (savings_percentage < 10.0) {
        return 1;  /* Low savings */
    }
    if (savings_percentage < 20.0) {
        return 2;  /* Moderate savings */
    }
    if (savings_percentage <= 50.0) {
        return 3;  /* Healthy savings (recommended 20-50%) */
    }
    return 4;      /* Exceptional savings (>50%) */
}
