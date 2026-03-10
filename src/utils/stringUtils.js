export const toTitleCase = (str) => {
    if (!str) return '';
    return str.replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
    );
};

export const formatName = (str) => {
    if (!str) return '';
    // Letras, espacios y tildes/eñes
    let cleaned = str.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    return toTitleCase(cleaned);
};

export const formatDNI = (str) => {
    if (!str) return '';
    // Solo números, máx 8 caracteres
    return str.replace(/\D/g, '').slice(0, 8);
};

export const formatPhone = (str) => {
    if (!str) return '';
    // Solo números y guiones
    let cleaned = str.replace(/[^\d-]/g, '');

    // Validar máximo de 13 dígitos
    let digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly.length > 13) {
        let count = 0;
        cleaned = cleaned.split('').filter(char => {
            if (char === '-') return true;
            count++;
            return count <= 13;
        }).join('');
    }

    // Máximo general de 16 caracteres para acomodar los guiones
    return cleaned.slice(0, 16);
};
