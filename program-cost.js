(() => {
  const form = document.getElementById('costPlanner');
  if (!form) return;

  const moneyFields = [
    'tuitionFees',
    'booksEquipment',
    'medicalChecks',
    'testingLicensing',
    'travelChildcare',
    'lostIncome'
  ];
  const aidFields = ['grantsScholarships', 'workforceEmployer', 'amountSaved'];
  const totalEl = document.getElementById('totalCost');
  const gapEl = document.getElementById('remainingGap');
  const monthlyEl = document.getElementById('monthlyGoal');
  const messageEl = document.getElementById('costMessage');
  const monthsEl = document.getElementById('savingMonths');
  const resetButton = document.getElementById('resetCostPlanner');

  const valueOf = (id) => {
    const element = document.getElementById(id);
    const value = Number.parseFloat(element?.value || '0');
    return Number.isFinite(value) && value > 0 ? value : 0;
  };

  const formatMoney = (value) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);

  const update = () => {
    const total = moneyFields.reduce((sum, id) => sum + valueOf(id), 0);
    const help = aidFields.reduce((sum, id) => sum + valueOf(id), 0);
    const gap = Math.max(0, total - help);
    const months = Math.max(1, Number.parseInt(monthsEl.value, 10) || 6);
    const monthly = gap / months;

    totalEl.textContent = formatMoney(total);
    gapEl.textContent = formatMoney(gap);
    monthlyEl.textContent = formatMoney(monthly);

    if (total === 0) {
      messageEl.textContent = 'Enter the school’s itemized costs to build your estimate. Your numbers stay in this browser and are not submitted to EMSCodeSim.';
    } else if (gap === 0) {
      messageEl.textContent = 'Your entered aid and savings cover the estimated cost. Confirm when each payment arrives and whether any amount must be repaid.';
    } else {
      messageEl.textContent = `This leaves an estimated ${formatMoney(gap)} gap. Apply for grants, workforce funding, employer support, and scholarships before relying on loans.`;
    }
  };

  form.addEventListener('input', update);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    update();
    document.getElementById('costResults').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  resetButton?.addEventListener('click', () => {
    form.reset();
    update();
    document.getElementById('tuitionFees')?.focus();
  });

  update();
})();
