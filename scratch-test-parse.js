function parseTemplateVars(text, contract, settings) {
  const currencyCode = contract.currency || 'INR';
  const currencySymbol = currencyCode === 'USD' ? '$' : currencyCode === 'EUR' ? '€' : currencyCode === 'GBP' ? '£' : '₹';
  const amount = parseFloat(contract.total_amount) || 0;
  const formattedAmount = amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  let renderedText = text;

  // 1. Dynamic replacement for ALL fields inside the contract object
  const matches = renderedText.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
  if (matches) {
    matches.forEach(match => {
      const varName = match.replace(/[{}]/g, '').trim();
      
      const boldVars = ['total_amount', 'currency', 'start_date', 'end_date', 'company_name', 'client_signatory_name', 'client_name', 'client_company', 'client_designation', 'authorized_signatory'];
      const shouldBold = boldVars.includes(varName);
      
      let val = '';

      if (varName === 'total_amount') {
        val = formattedAmount;
      } else if (varName === 'currency') {
        val = currencySymbol;
      } else if (varName === 'start_date' || varName === 'end_date') {
        const d = contract[varName];
        val = d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : `[${varName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}]`;
      } else if (varName === 'company_name') {
        val = settings?.company_name || 'KKeyQik Private Limited';
      } else if (varName === 'client_signatory_name') {
        val = contract.client_selections?.client_signatory_name || contract.client_name || '[Client Signatory Name]';
      } else if (contract[varName] !== undefined && contract[varName] !== null) {
        val = contract[varName];
      }

      if (val !== '') {
        if (shouldBold) val = `<strong>${val}</strong>`;
        renderedText = renderedText.split(match).join(val);
      }
    });
  }

  // 3. Parse basic Markdown bold (**text**)
  renderedText = renderedText.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');

  return renderedText;
}

const contract = {
  total_amount: '20000',
  currency: 'INR',
  start_date: '2026-08-14',
  end_date: '2027-08-14'
};
const settings = {};

console.log(parseTemplateVars("The total compensation for the services described in this Agreement shall be {{currency}} {{total_amount}}.", contract, settings));
console.log(parseTemplateVars("Period: {{start_date}} to {{end_date}}", contract, settings));
