import SeriesCard from './SeriesCard'

function SeriesGrid({ series, onSelect }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '1.5rem',
        marginTop: '1.5rem',
      }}
    >
      {series.map((item) => (
        <SeriesCard
          key={item.id}
          item={item}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

export default SeriesGrid