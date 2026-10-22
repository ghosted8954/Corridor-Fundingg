
const form = document.getElementById("calculatorForm");
const statusElement = document.getElementById("calculatorStatus");

const monthlyPaymentElement = document.getElementById("monthlyPayment");
const totalRepaymentElement = document.getElementById("totalRepayment");
const totalInterestElement = document.getElementById("totalInterest");

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function formatMoney(value) {
  return currencyFormatter.format(value);
}

function calculateLoan(principal, annualRatePercent, months) {
  const monthlyRate = annualRatePercent / 100 / 12;

  let monthlyPayment;

  if (monthlyRate === 0) {
    monthlyPayment = principal / months;
  } else {
    const growth = Math.pow(1 + monthlyRate, months);

    monthlyPayment =
      principal * monthlyRate * growth / (growth - 1);
  }

  const totalRepayment = monthlyPayment * months;
  const totalInterest = totalRepayment - principal;

  return {
    monthlyPayment,
    totalRepayment,
    totalInterest
  };
}

function resetResults(message) {
  monthlyPaymentElement.textContent = "—";
  totalRepaymentElement.textContent = "—";
  totalInterestElement.textContent = "—";
  statusElement.textContent = message;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const principal = Number(
    document.getElementById("loanAmount").value
  );

  const annualRate = Number(
    document.getElementById("annualRate").value
  );

  const months = Number(
    document.getElementById("loanTerm").value
  );

  if (
    !Number.isFinite(principal) ||
    !Number.isFinite(annualRate) ||
    !Number.isFinite(months) ||
    principal < 1 ||
    principal > 100000000 ||
    annualRate < 0 ||
    annualRate > 100 ||
    !Number.isInteger(months) ||
    months < 1
  ) {
    resetResults("Please enter valid loan details.");
    return;
  }

  const result = calculateLoan(principal, annualRate, months);

  if (
    !Number.isFinite(result.monthlyPayment) ||
    !Number.isFinite(result.totalRepayment) ||
    !Number.isFinite(result.totalInterest)
  ) {
    resetResults("Unable to calculate these values. Please try again.");
    return;
  }

  monthlyPaymentElement.textContent =
    formatMoney(result.monthlyPayment);

  totalRepaymentElement.textContent =
    formatMoney(result.totalRepayment);

  totalInterestElement.textContent =
    formatMoney(Math.max(0, result.totalInterest));

  statusElement.textContent =
    `Estimate calculated for ${months} months at ${annualRate}% annual interest.`;
});

// Calculate the example when the page first opens.
form.requestSubmit();
