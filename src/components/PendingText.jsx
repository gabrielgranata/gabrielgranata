/*
  Renders a string, styling any [bracketed run] as a placeholder — muted
  italic, the resume's convention: a placeholder, not a claim. Keeping the
  brackets in the data (instead of a separate "pending" flag) means the raw
  data module reads honestly on its own.
*/
export default function PendingText({ text }) {
  const parts = text.split(/(\[[^\]]*\])/)
  return parts.map((part, i) =>
    part.startsWith('[') ? (
      <span key={i} className="pend">
        {part}
      </span>
    ) : (
      part
    ),
  )
}
