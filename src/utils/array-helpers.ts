/**
 * Array utility functions for common operations
 */

/**
 * Remove duplicate elements from an array based on a key function
 * @param array - The input array
 * @param keyFn - Function to extract the key for comparison
 * @returns Array with duplicates removed
 */
export function removeDuplicates<T>(array: T[], keyFn?: (item: T) => any): T[] {
    if (!keyFn) {
        // For primitive types, use Set for deduplication
        return Array.from(new Set(array));
    }

    // For objects, use Map with key function
    const seen = new Map();
    return array.filter(item => {
        const key = keyFn(item);
        if (seen.has(key)) {
            return false;
        }
        seen.set(key, true);
        return true;
    });
}

/**
 * Remove duplicate elements from an array of objects based on a property
 * @param array - The input array of objects
 * @param property - The property name to use for comparison
 * @returns Array with duplicates removed
 */
export function removeDuplicatesByProperty<T>(array: T[], property: keyof T): T[] {
    return removeDuplicates(array, item => item[property]);
}

/**
 * Remove duplicate elements from an array of primitive values
 * @param array - The input array of primitives
 * @returns Array with duplicates removed
 */
export function removeDuplicatePrimitives<T extends string | number | boolean>(array: T[]): T[] {
    return Array.from(new Set(array));
}

/**
 * Examples of usage:
 * 
 * // For primitive arrays:
 * const numbers = [1, 2, 2, 3, 4, 4, 5];
 * const uniqueNumbers = removeDuplicatePrimitives(numbers); // [1, 2, 3, 4, 5]
 * 
 * // For object arrays with property:
 * const users = [
 *   { id: 1, name: 'John' },
 *   { id: 2, name: 'Jane' },
 *   { id: 1, name: 'John Doe' } // duplicate id
 * ];
 * const uniqueUsers = removeDuplicatesByProperty(users, 'id'); // [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]
 * 
 * // For object arrays with custom key function:
 * const uniqueUsersByEmail = removeDuplicates(users, user => user.email);
 * 
 * // For string arrays:
 * const strings = ['a', 'b', 'a', 'c'];
 * const uniqueStrings = removeDuplicatePrimitives(strings); // ['a', 'b', 'c']
 */