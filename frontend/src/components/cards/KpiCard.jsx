const KpiCard = ({ title, value, icon, color }) => {
  return (
    <div className={`bg-white rounded-xl shadow-md p-4 border-l-8 ${color}`}>
      <div className="flex justify-between items-center">
        <div>
          <p className="text-gray-500 text-sm uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold mt-1">{value ?? '...'}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
};
export default KpiCard;