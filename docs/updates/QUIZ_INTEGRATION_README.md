# Daily EMS Quiz integration

The Daily EMS Quiz website is now included inside EMSCodeSim at `/quiz/`.

## Main additions
- Daily EMT Quiz: `/quiz/emt_quiz.html`
- Daily Paramedic Quiz: `/quiz/paramedic_quiz.html`
- EMS Daily Fact: `/quiz/ems_fact.html`
- Daily Home Medication: `/quiz/home_med.html`
- MedWord: `/quiz/medword.html`
- Daily Beat: `/quiz/daily_beat.html`
- Daily Sim: `/quiz/daily_sim.html`

EMSCodeSim navigation, homepage, training library, search index, sitemap, footer links, and Netlify redirects were updated. The original EMSCodeSim deployment configuration remains the active configuration.

## Moving the old domain
After this project is deployed and verified, configure `dailyemsquiz.com` to redirect to `https://emscodesim.com/quiz/`. A domain-level 301 redirect must be configured in the hosting/domain settings for the old site; it cannot be completed only by files in this EMSCodeSim project.
