/**
 * SecureSave - Mathematical Security System (RSA) Header
 * Educational Small-Number RSA Demonstration
 */

#ifndef ENCRYPTION_H
#define ENCRYPTION_H

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Computes RSA modulus n = p * q */
int64_t rsa_compute_n(int64_t p, int64_t q);

/* Computes Euler's Totient phi(n) = (p - 1) * (q - 1) */
int64_t rsa_compute_totient(int64_t p, int64_t q);

/* Validates public exponent e: must satisfy 1 < e < phi and gcd(e, phi) == 1 */
int rsa_validate_e(int64_t e, int64_t phi);

/* Computes private key d such that (d * e) % phi == 1 */
int64_t rsa_compute_d(int64_t e, int64_t phi);

/* Encrypts message: C = (M^e) % n */
int64_t rsa_encrypt_msg(int64_t message, int64_t e, int64_t n);

/* Decrypts ciphertext: M = (C^d) % n */
int64_t rsa_decrypt_msg(int64_t cipher, int64_t d, int64_t n);

/* Comprehensive validation of RSA parameters:
 * Returns:
 *  0: All valid
 *  1: p is not prime
 *  2: q is not prime
 *  3: p equals q
 *  4: e is out of range or not coprime with phi
 *  5: message exceeds or equals modulus n (M >= n)
 *  6: message is negative
 */
int rsa_validate_all(int64_t p, int64_t q, int64_t e, int64_t message);

#ifdef __cplusplus
}
#endif

#endif /* ENCRYPTION_H */
