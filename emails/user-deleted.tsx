// emails/user-deleted.tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface UserDeletedEmailProps {
  firstName: string;
  deletedAt: Date;
}

export default function UserDeletedEmail({
  firstName,
  deletedAt,
}: UserDeletedEmailProps) {
  const formattedDate = deletedAt.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const containerStyle: React.CSSProperties = {
    maxWidth: "560px",
    margin: "0 auto",
    padding: "40px 16px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "32px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  };

  const headingStyle: React.CSSProperties = {
    fontSize: "22px",
    fontWeight: 700,
    color: "#1a1a1a",
    margin: "0 0 8px",
  };

  const textStyle: React.CSSProperties = {
    fontSize: "15px",
    lineHeight: "1.6",
    color: "#555555",
    margin: "0 0 12px",
  };

  const alertStyle: React.CSSProperties = {
    backgroundColor: "#fff5f5",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "14px 16px",
    marginTop: "20px",
  };

  const alertTextStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "#b91c1c",
    margin: 0,
  };

  const footerStyle: React.CSSProperties = {
    textAlign: "center",
    fontSize: "12px",
    color: "#aaaaaa",
    marginTop: "24px",
  };

  return (
    <Html lang="it">
      <Head />
      <Preview>Il tuo account Librolo è stato eliminato</Preview>
      <Body style={{ backgroundColor: "#f5f5f5", margin: 0, padding: 0 }}>
        <Container style={containerStyle}>
          <Section style={cardStyle}>
            <Heading style={headingStyle}>Account eliminato</Heading>
            <Text style={textStyle}>Ciao {firstName},</Text>
            <Text style={textStyle}>
              Ti informiamo che il tuo account Librolo è stato{" "}
              <strong>eliminato definitivamente</strong> in data{" "}
              <strong>{formattedDate}</strong> da un amministratore della
              piattaforma.
            </Text>
            <Text style={textStyle}>
              I tuoi dati personali sono stati rimossi dai sistemi attivi. Se
              ritieni che questa operazione sia avvenuta per errore, contatta il
              nostro supporto.
            </Text>
            <Section style={alertStyle}>
              <Text style={alertTextStyle}>
                Se non riconosci questa operazione, rispondi a questa email o
                scrivici a support@librolo.it
              </Text>
            </Section>
          </Section>
          <Text style={footerStyle}>
            &copy; {new Date().getFullYear()} Librolo — Tutti i diritti riservati
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
