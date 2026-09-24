export default function TargetBox() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div
        className="w-32 h-40 md:w-40 md:h-48 rounded-2xl glow-box"
        style={{ background: 'transparent' }}
      />
    </div>
  );
}
