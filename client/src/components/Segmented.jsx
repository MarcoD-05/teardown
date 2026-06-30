// Reusable toggle section, replacing the copy and paste blocks
export default function Segmented({ options, value, onChange }) {
  return (
    <div className="input-toggle">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          className={value === opt.value ? 'active' : ''}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}