

const MedicineName = ({ name, truncate = false, className = "" }) => {
  return (
    <span 
      className={`inline-block max-w-full ${
        truncate ? "truncate" : "break-words [overflow-wrap:break-word]"
      } ${className}`}
      title={name?.length > 20 ? name : undefined}
    >
      {name || "Unknown"}
    </span>
  );
};

export default MedicineName;