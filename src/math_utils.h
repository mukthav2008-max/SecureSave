/**
 * SecureSave - Mathematical Utilities Header
 * Declares core mathematical functions: GCD, Modular Inverses, Safe Exponentiation, Primality.
 */

#ifndef MATH_UTILS_H
#define MATH_UTILS_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Checks if a number n is prime using trial division (O(sqrt(n))) */
int is_prime(int64_t n);

/* Computes Greatest Common Divisor using Euclidean Algorithm */
int64_t gcd(int64_t a, int64_t b);

/* Computes Extended GCD: a*x + b*y = gcd(a, b) */
int64_t extended_gcd(int64_t a, int64_t b, int64_t *x, int64_t *y);

/* Computes Modular Multiplicative Inverse of a modulo m: (a * x) % m == 1 */
int64_t mod_inverse(int64_t a, int64_t m);

/* Safe 64-bit modular multiplication to prevent integer overflow: (a * b) % mod */
int64_t mod_mul(int64_t a, int64_t b, int64_t mod);

/* Computes Modular Exponentiation: (base^exp) % mod */
int64_t mod_pow(int64_t base, int64_t exp, int64_t mod);

/* Absolute value for double */
double safe_abs(double val);

/* Power function for double */
double safe_pow(double base, int exp);

#ifdef __cplusplus
}
#endif

#endif /* MATH_UTILS_H */

