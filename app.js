// app.js

const BACKEND_URL = 'https://manahtar-hsph-food-backend.hf.space'; // your deployed backend URL

document.getElementById('foodForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const meetingName = document.getElementById('meetingName').value.trim();
  const talkDatesRaw = document.getElementById('talkDates').value.trim();
  const pickupTime = document.getElementById('pickupTime').value.trim();
  const attendeeCount = document.getElementById('attendeeCount').value.trim();
  const mealType = document.getElementById('mealType').value.trim();
  const perPersonBudget = document.getElementById('perPersonBudget').value.trim();
  const pickupPeopleRaw = document.getElementById('pickupPeople').value.trim();

  const talkDates = talkDatesRaw
    ? talkDatesRaw.split(/[;,]+/).map(d => d.trim()).filter(Boolean)
    : [];
  const pickupPeople = pickupPeopleRaw
    ? pickupPeopleRaw.split(/[;,]+/).map(e => e.trim()).filter(Boolean)
    : [];

  const outputEl = document.getElementById('output');
  outputEl.textContent = 'Generating plan… this may take a moment.';

  // Build the prompt equivalent to your Opal config
  const prompt = buildPrompt({
    meetingName,
    talkDates,
    pickupTime,
    attendeeCount,
    mealType,
    perPersonBudget,
    pickupPeople
  });

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }

    const data = await res.json();
    // Expecting { result: "..." } from the backend
    outputEl.textContent = data.result || 'No result returned from the model.';
  } catch (err) {
    console.error(err);
    outputEl.textContent = 'Error generating plan. Check console for details.';
  }
});

/**
 * Build a single, detailed prompt string from the form inputs.
 * This combines your "Generate Food Order" and "Generate pickup scheduling" behavior.
 */
function buildPrompt({
  meetingName,
  talkDates,
  pickupTime,
  attendeeCount,
  mealType,
  perPersonBudget,
  pickupPeople
}) {
  const datesText = talkDates.length ? talkDates.join(', ') : 'N/A';
  const emailsText = pickupPeople.length ? pickupPeople.join(', ') : 'N/A';
  const budgetText = perPersonBudget || '(default: $10 pp for lunch/dinner, $5 pp for breakfast)';

  return `
You are helping organize departmental talks at the Harvard T.H. Chan School of Public Health
(677 Huntington Avenue, Boston, MA 02115).

I will give you:
- Meeting name
- Talk date(s)
- Desired food pickup time
- Estimated number of attendees
- Meal type
- Per-person budget
- A list of people who can pick up food (email addresses)

Your tasks:

1) FOOD ORDER GENERATION

For each talk date, choose a restaurant within a 10-minute walk of the Harvard T.H. Chan School of Public Health.
Requirements:
- For the given meal type: ${mealType || 'N/A'}
- If there are multiple dates, use a *different* restaurant for each date.
- Try to vary cuisine types across dates so food does not get repetitive.
- Only use restaurants with Google review ratings of 3.0 or higher.
- Create a detailed itemized order for the estimated number of attendees: ${attendeeCount}.
- Include each menu item, quantity, and price.
- The *total* cost including a 20% tip must not exceed (attendee_count × per_person_budget).
  - attendee_count = ${attendeeCount}
  - per_person_budget = ${budgetText}
- The order should be detailed (e.g., not just "variety of pizzas", but specific pizzas with variety).
- For each restaurant, include a live, working URL to the restaurant/menu.

2) PICKUP SCHEDULING AND EMAIL DRAFTS

Use:
- Meeting name: ${meetingName}
- Talk date(s): ${datesText}
- Desired pickup time: ${pickupTime || 'N/A'}
- Pickup people (emails, used in rotation): ${emailsText}

For each order you created:
- Assign exactly one person from the pickup people list to be responsible for placing and picking up that order.
- Rotate/cycle through the list so the same person is not assigned repeatedly in a row.
- Draft **two email templates** for the responsible person:
  1) A "day-before" email, to be sent at 9:00 AM the day before the meeting.
  2) A reminder email, to be sent 4 hours before the meeting.

Each email should include:
- Meeting name
- Meeting date
- Pickup time
- Restaurant name and address
- Restaurant/menu URL
- Detailed list of items to order (items, quantities, prices)
- Total cost, tip, and grand total
- Clear instructions about picking up the order

3) OUTPUT FORMAT

Return your answer as clear, human-readable text that could be:
- Displayed as HTML on a web page, and
- Easily copied into a Google Sheet if needed.

Organize it as:

SECTION 1: SUMMARY TABLE (plain text table or bullet list) of:
- For each date: restaurant, cuisine, total cost, per-person cost, assigned pickup person email.

SECTION 2: DETAILED ORDERS
- For each date: restaurant info, menu items with quantities and prices, totals, and URL.

SECTION 3: EMAIL DRAFTS
- For each date and assigned person: the two fully-written email drafts (day-before and 4-hours-before),
  clearly labeled.
`;
}
