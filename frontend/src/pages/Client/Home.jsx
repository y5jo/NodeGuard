import { useNavigate } from "react-router-dom";
import "../../Components/design/client/Home.css";
import ClientHeader from "../../Components/navbar/ClientHeader";
import incidentReportImage from "../../public/Incidentlogo.svg";
import trackReportImage from "../../public/Tracklogo.svg";
import warning1 from "../../public/warning info 1.svg";
import warning2 from "../../public/warning info 2.svg";
import warning3 from "../../public/warning info 3.svg";
import warning from "../../public/warning Icon.svg";
import CHEVRON_ICON_URL from "../../public/chev.png";
import QUESTION_ICON_URL from "../../public/question.png";

export default function ClientHome() {
    const navigate = useNavigate();
    const FAQ_ITEMS = [
  {
    id: 1,
    question: 'Can I report anonymously, and is my personal identity protected?',
    answer:
      'Yes. Providing your name and contact details is completely optional. If you choose not to provide personal details, your report will be cataloged under an anonymous classification. All internal case records and public verification lookups strictly redact personal identifiers.',
    defaultOpen: true,
  },
  {
    id: 2,
    question: 'How does cryptographic fingerprinting protect legal admissibility in court?',
    answer: 'Cryptographic fingerprinting creates a unique, immutable hash of your evidence, which is stored in a tamper-evident ledger. This ensures that the evidence cannot be altered without detection, making it admissible in court as a reliable and authentic record.',
    defaultOpen: false,
  },
  {
    id: 3,
    question: 'Can I report anonymously, and is my personal identity protected?',
    answer: 'Yes. Providing your name and contact details is completely optional. If you choose not to provide personal details, your report will be cataloged under an anonymous classification. All internal case records and public verification lookups strictly redact personal identifiers.',
    defaultOpen: false,
  },
  {
    id: 4,
    question: 'What happens after I submit, and what are the expected response timelines?',
    answer: 'After submission, your report is reviewed by our cybercrime investigation team. You will receive an acknowledgment of receipt, and if you provided contact information, you may be contacted for additional details. Response timelines vary based on case complexity, but you can track the status of your report using the assigned CASE-YYYY-XXXXX tracking code.',
    defaultOpen: false,
  },
];
    return (
        <div className="client-home">
            <ClientHeader />
            <div className="home-header">
                <h1>Report Cyber Incidents & Secure Digital Evidence</h1>
                <p className="phead">An official platform for citizens to file cybercrime incidents, generate cryptographic evidence baselines, and receive verified investigation tracking.</p>
            </div>

        <section className="client-action-section">
            <div className="File-appeal-container">
                <img src={incidentReportImage} alt="File Appeal" className="File-appeal-image" />
                <h2>File Incident Report</h2>
                <p> Submit details regarding phishing, scam transfers, identity theft, or extortion. Upload original evidence files for memory-safe SHA-256 fingerprinting.</p>
                <button className="File-appeal-button" onClick={() => navigate('/client/report')}>File Report</button>
            </div>
            <div className="Track-appeal-container">
                <img src={trackReportImage} alt="Track Appeal" className="Track-appeal-image" />
                <h2>Track Report Status</h2>
                <p>Look up an active case using your assigned CASE-YYYY-XXXXX tracking code to review real-time status updates and cryptographic custody verification.</p>
                <button className="Track-appeal-button" onClick={() => navigate('/client/track')}>Check Status Report</button>
             </div>
            </section>
      
      <section className="client-warning-section">
  <div className="client-warning-container">

    <div className="client-warning-header">
      <div className="client-warning-title">
        <img src={warning} alt="Evidence preservation warning" className="client-warning-image" />
        <h2>Evidence Preservation Notice</h2>
      </div>
      <p>Follow these critical steps immediately after an incident to ensure your evidence is legally admissible in formal investigations:</p>
    </div>

    <div className="client-warning-grid">
      <div className="client-warning-info">
        <div className="client-warning-info-title">
          <img src={warning1} alt="" className="client-warning-info-image client-warning-info-image--large" />
          <h3>Preserve Unaltered Screenshots</h3>
        </div>
        <p>Do not crop, edit, mark, or blur screenshots. Ensure status bars, dates, timestamps, usernames, and profile URLs are fully visible.</p>
      </div>

      <div className="client-warning-info">
        <div className="client-warning-info-title">
          <img src={warning2} alt="" className="client-warning-info-image" />
          <h3>Do Not Delete Chat Logs or Messages</h3>
        </div>
        <p>Keep complete conversation histories on messaging apps (Telegram, WhatsApp, Messenger, Viber). Export raw chat logs if supported.</p>
      </div>

      <div className="client-warning-info">
        <div className="client-warning-info-title">
          <img src={warning3} alt="" className="client-warning-info-image" />
          <h3>Retain Financial Reference Numbers</h3>
        </div>
        <p>Save official transaction receipts, bank reference numbers, GCash/Maya reference IDs, and wallet addresses involved in fraudulent transfers.</p>
      </div>
    </div>

  </div>
</section>
    
<section className="faq">
      <div className="faq-head">
        <p className="kicker">CyberTrace FAQ</p>
        <h2>Frequently Asked Questions</h2>
        <p>
          Essential information regarding reporting security, citizen privacy,
          and investigative timelines.
        </p>
      </div>

      <div className="faq-list">
        {FAQ_ITEMS.map((item) => (
          <details key={item.id} open={item.defaultOpen}>
            <summary>
              <img className="q" alt="" src={QUESTION_ICON_URL} />
              <span>{item.question}</span>
              <img className="chev" alt="" src={CHEVRON_ICON_URL} />
            </summary>
            <div className="answer">
              <hr />
              {item.answer}
            </div>
          </details>
        ))}
      </div>
</section>
    </div>
  );
}