export const formatNumberAsCurrency = (number, currencyType = "Naira (NGN)") => {
    
    // Map currency display names to currency codes and locales
    const currencyMap = {
        "Naira (NGN)": { code: 'NGN', locale: 'en-NG' },
        "Dollar (USD)": { code: 'USD', locale: 'en-US' },
        "Pounds (GBP)": { code: 'GBP', locale: 'en-GB' },
        "Euro (EUR)": { code: 'EUR', locale: 'en-EU' }
    };
    
    const currency = currencyMap[currencyType] || currencyMap["Naira (NGN)"];
    
    return new Intl.NumberFormat(currency.locale, { 
        style: 'currency', 
        currency: currency.code 
    }).format(number);
}