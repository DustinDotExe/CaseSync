import type { ReactNode } from 'react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 p-8 md:p-12 space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Terms of Service</h1>
          <p className="text-slate-500 mt-2 text-sm">CasePlanr &mdash; Last updated: May 7, 2025</p>
        </div>

        <Section title="Acceptance of Terms">
          <p>
            By accessing or using CasePlanr, you agree to be bound by these Terms of Service. If you do not
            agree, do not use the application. CasePlanr is operated by <strong>Dustin Burton</strong>. Questions
            may be directed to{' '}
            <a href="mailto:dustin.a.burton@gmail.com" className="text-burnt-peach-600 hover:underline font-medium">
              dustin.a.burton@gmail.com
            </a>.
          </p>
        </Section>

        <Section title="Authorized Use">
          <p>
            CasePlanr is intended solely for use by authorized court case management professionals. Access is
            granted on an individual basis. You are responsible for maintaining the confidentiality of your
            account credentials and for all activity that occurs under your account. You must not share your
            login credentials with others or allow unauthorized access to your account.
          </p>
          <p>
            You agree to use CasePlanr only for lawful purposes and in accordance with applicable laws,
            regulations, and court policies governing the handling of participant and case data.
          </p>
        </Section>

        <Section title="Data Responsibility">
          <p>
            You are solely responsible for the accuracy, legality, and appropriateness of all data you enter
            into CasePlanr, including participant names, case numbers, goals, observations, and any other
            information. CasePlanr provides tools to assist with case management — it does not verify,
            validate, or take responsibility for the content you create.
          </p>
          <p>
            Participant records in CasePlanr may contain sensitive information. You are responsible for
            ensuring your use of the application complies with applicable privacy laws and court data handling
            policies.
          </p>
        </Section>

        <Section title="AI-Assisted Features">
          <p>
            CasePlanr includes optional AI-powered writing assistance features (goal refinement, note
            enhancement, hearing briefs) powered by Google Gemini. Output from these features is generated
            automatically and may not be accurate, complete, or appropriate for every situation. You are
            responsible for reviewing, editing, and approving all AI-generated content before using it in any
            official capacity. AI output does not constitute professional legal advice.
          </p>
        </Section>

        <Section title="Prohibited Conduct">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-700">
            <li>Access or attempt to access another user&rsquo;s case records.</li>
            <li>Use the application to store data unrelated to authorized case management activities.</li>
            <li>Attempt to reverse-engineer, scrape, or otherwise extract data from the application.</li>
            <li>Use the application in any way that could damage, disable, or impair the service.</li>
            <li>Share access credentials or allow unauthorized individuals to access the application.</li>
          </ul>
        </Section>

        <Section title="Intellectual Property">
          <p>
            CasePlanr and its underlying software, design, and content are the property of Dustin Burton.
            Nothing in these Terms grants you any rights in the application other than the limited right to
            use it as described herein. Data you enter into the application remains your own.
          </p>
        </Section>

        <Section title="Disclaimer of Warranties">
          <p>
            CasePlanr is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, either
            express or implied. We do not warrant that the application will be uninterrupted, error-free, or
            free of harmful components. We make no warranties regarding the accuracy or reliability of any
            AI-generated content.
          </p>
        </Section>

        <Section title="Limitation of Liability">
          <p>
            To the fullest extent permitted by law, Dustin Burton shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages arising from your use of, or inability
            to use, CasePlanr — including but not limited to loss of data, loss of revenue, or harm arising
            from reliance on AI-generated content.
          </p>
        </Section>

        <Section title="Termination">
          <p>
            We reserve the right to suspend or terminate access to CasePlanr at any time, for any reason,
            with or without notice. You may stop using the application at any time. Upon termination, your
            right to use CasePlanr ceases immediately. Provisions that by their nature should survive
            termination (including data responsibility, disclaimers, and limitation of liability) will survive.
          </p>
        </Section>

        <Section title="Changes to These Terms">
          <p>
            We may update these Terms from time to time. The date at the top of this page reflects the most
            recent revision. Continued use of CasePlanr after changes constitutes your acceptance of the
            updated Terms.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            For questions about these Terms, contact:{' '}
            <a href="mailto:dustin.a.burton@gmail.com" className="text-burnt-peach-600 hover:underline font-medium">
              dustin.a.burton@gmail.com
            </a>
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">{title}</h2>
      <div className="text-slate-700 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}
