type Props = {
  text: string;
  area?: string;
  onClick: () => void;
};

export default function SuggestionCard({ text, area, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "16px",
        borderRadius: "12px",
        border: "1px solid #ccc",
        marginBottom: "12px",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: "16px", fontWeight: "bold" }}>{text}</div>
      {area && (
        <div style={{ fontSize: "12px", opacity: 0.6 }}>{area}</div>
      )}
    </div>
  );
}