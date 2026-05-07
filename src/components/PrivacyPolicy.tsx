export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 p-8 md:p-12 space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Privacy Policy</h1>
          <p className="text-slate-500 mt-2 text-sm">CasePlanr &mdash; Last updated: May 7, 2025</p>
        </div>

        <Section title="Overview">
          <p>
            CasePlanr is a case management tool for authorized court case managers. This policy explains what
            information we collect, how we use it, and how we protect it. CasePlanr is operated by{' '}
            <strong>Dustin Burton</strong>. Questions may be directed to{' '}
            <a href="mailto:dustin.a.burton@gmail.com" className="text-burnt-peach-600 hover:underline font-medium">
              dustin.a.burton@gmail.com
            </a>.
          </p>
        </Section>

        <Section title="Information We Collect">
          <Subsection title="Account Information">
            <p>
              When you sign in with Google, we receive your name, email address, and profile photo from Google.
              When you register with email and password, we collect your email address. You may optionally add a
              job title to your profile within the app.
            </p>
          </Subsection>
          <Subsection title="Case Data You Enter">
            <p>
              CasePlanr stores participant case records that you create, including participant names, case numbers,
              phase progress, goals, case manager observations, and criminogenic need domain selections. This data is
              entered by you and belongs to you.
            </p>
          </Subsection>
          <Subsection title="Audit Logs">
            <p>
              The app automatically records an audit log of every change made to case records (e.g., goals added,
              phases updated, profiles deleted). These logs include the action taken, the affected record, and the
              case manager who made the change.
            </p>
          </Subsection>
          <Subsection title="UI Preferences">
            <p>
              Theme (light/dark) and color palette preferences are stored in your browser&rsquo;s local storage
              only — they are never sent to our servers.
            </p>
          </Subsection>
        </Section>

        <Section title="How We Use Your Information">
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li>To authenticate your identity and provide access to your case records.</li>
            <li>To store and display participant profiles and case plans you create.</li>
            <li>To maintain audit logs for accountability and compliance purposes.</li>
            <li>
              To power AI-assisted features (goal refinement, note enhancement, hearing briefs) using the Google
              Gemini API. Your case notes and goal text may be sent to Gemini on the server side when you use these
              features. We do not send personally identifying information (names, case numbers) to Gemini.
            </li>
          </ul>
        </Section>

        <Section title="Data Storage and Security">
          <p>
            All data is stored in Google Cloud Firestore. Each user&rsquo;s data is access-controlled so that only
            you can read or modify your own case records. Data is transmitted over TLS/HTTPS. We do not sell, rent,
            or share your data with third parties.
          </p>
        </Section>

        <Section title="Third-Party Services">
          <p>CasePlanr uses the following Google services:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-700">
            <li>
              <strong>Firebase Authentication</strong> — handles sign-in with Google and email/password, and sends
              password reset emails.
            </li>
            <li>
              <strong>Google Cloud Firestore</strong> — stores your account profile and all case data.
            </li>
            <li>
              <strong>Google Gemini API</strong> — powers optional AI writing assistance features. Used server-side
              only.
            </li>
          </ul>
          <p className="mt-3">
            No analytics, advertising, crash reporting, or behavioral tracking tools are used.
          </p>
        </Section>

        <Section title="Google User Data">
          <p>
            CasePlanr requests access to your Google account solely for the purpose of signing you in. We use your
            Google-provided name and email to create and identify your account. We do not access your Gmail,
            Google Drive, Google Calendar, or any other Google service data. We do not use your Google account
            information for advertising or share it with any third party.
          </p>
          <p className="mt-2">
            Google&rsquo;s use of data when you sign in with Google is governed by{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-burnt-peach-600 hover:underline font-medium"
            >
              Google&rsquo;s Privacy Policy
            </a>.
          </p>
        </Section>

        <Section title="Data Retention and Deletion">
          <p>
            Your case records and account data are retained as long as your account exists. You may delete individual
            participant profiles within the app at any time. To request deletion of your account and all associated
            data, email{' '}
            <a href="mailto:dustin.a.burton@gmail.com" className="text-burnt-peach-600 hover:underline font-medium">
              dustin.a.burton@gmail.com
            </a>{' '}
            and we will process your request within 30 days. Audit log entries for deleted participant profiles are
            retained for compliance purposes.
          </p>
        </Section>

        <Section title="Children's Privacy">
          <p>
            CasePlanr is intended for use by adult court case management professionals. We do not knowingly collect
            information from anyone under 18 years of age.
          </p>
        </Section>

        <Section title="Changes to This Policy">
          <p>
            We may update this policy from time to time. The date at the top of this page reflects the most recent
            revision. Continued use of the app after changes constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            For privacy questions or data deletion requests, contact:{' '}
            <a href="mailto:dustin.a.burton@gmail.com" className="text-burnt-peach-600 hover:underline font-medium">
              dustin.a.burton@gmail.com
            </a>
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">{title}</h2>
      <div className="text-slate-700 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 className="font-semibold text-slate-800">{title}</h3>
      <div className="text-slate-600 leading-relaxed">{children}</div>
    </div>
  );
}
