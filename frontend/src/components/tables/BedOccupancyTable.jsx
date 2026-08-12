const BedOccupancyTable = ({ data }) => {
  if (!data || data.length === 0) return <p>Aucune donnée d'occupation</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border">
        <thead>
          <tr><th className="py-2 px-4 border">Bâtiment</th><th className="py-2 px-4 border">Étage</th><th className="py-2 px-4 border">Total lits</th><th className="py-2 px-4 border">Occupés</th><th className="py-2 px-4 border">Taux (%)</th></tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              <td className="border px-4 py-2">{row.batiment}</td>
              <td className="border px-4 py-2">{row.etage}</td>
              <td className="border px-4 py-2">{row.total_lits}</td>
              <td className="border px-4 py-2">{row.occupes}</td>
              <td className="border px-4 py-2">{Math.round((row.occupes / row.total_lits) * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default BedOccupancyTable;
