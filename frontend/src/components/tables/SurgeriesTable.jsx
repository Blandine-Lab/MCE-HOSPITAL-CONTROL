const SurgeriesTable = ({ data }) => {
  if (!data || data.length === 0) return <p>Aucune intervention prvue aujourd'hui.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border">
        <thead>
          <tr><th className="px-4 py-2 border">Patient</th><th className="px-4 py-2 border">Chirurgien</th><th className="px-4 py-2 border">Salle</th><th className="px-4 py-2 border">Heure</th><th className="px-4 py-2 border">Statut</th></tr>
        </thead>
        <tbody>
          {data.map((surg) => (
            <tr key={surg.id}>
              <td className="border px-4 py-2">{surg.patient_prenom} {surg.patient_nom}</td>
              <td className="border px-4 py-2">{surg.medecin_prenom} {surg.medecin_nom}</td>
              <td className="border px-4 py-2">{surg.salle}</td>
              <td className="border px-4 py-2">{new Date(surg.date_prevue).toLocaleTimeString()}</td>
              <td className="border px-4 py-2">{surg.statut}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default SurgeriesTable;
