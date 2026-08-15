// src/pages/paramedical/PlanningSoins.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaCalendar, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const PlanningSoins = () => {
  const [soins, setSoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    api.get(`/soins?date_debut=${startStr}&date_fin=${endStr}`)
      .then(res => {
        setSoins(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur chargement planning :', err);
        setLoading(false);
      });
  }, [currentDate]);

  const getWeekDates = () => {
    const dates = [];
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const weekDates = getWeekDates();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getSoinsForDay = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return soins.filter(s => s.date_soin === dateStr);
  };

  const changeWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setCurrentDate(newDate);
  };

  const formatWeekRange = () => {
    const start = weekDates[0];
    const end = weekDates[6];
    return `${start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '24px' }}>⏳ Chargement du planning...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaCalendar style={{ color: '#34d399' }} /> Planning des soins
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => changeWeek(-1)}
            style={{
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            <FaChevronLeft />
          </button>
          <span style={{ fontWeight: '500', minWidth: '150px', textAlign: 'center' }}>
            {formatWeekRange()}
          </span>
          <button
            onClick={() => changeWeek(1)}
            style={{
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            <FaChevronRight />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              background: '#3b82f6',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Aujourd'hui
          </button>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7, 1fr)', 
        gap: '12px'
      }}>
        {weekDates.map((date, index) => {
          const isToday = date.toDateString() === today.toDateString();
          const daySoins = getSoinsForDay(date);
          
          return (
            <div 
              key={index}
              style={{
                backgroundColor: isToday ? '#dbeafe' : 'white',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                minHeight: '200px',
                border: isToday ? '2px solid #3b82f6' : '1px solid #e2e8f0'
              }}
            >
              <div style={{ 
                textAlign: 'center', 
                marginBottom: '12px',
                paddingBottom: '8px',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <p style={{ 
                  margin: 0, 
                  fontWeight: 'bold',
                  color: isToday ? '#1e40af' : '#0f172a'
                }}>
                  {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
                </p>
                <p style={{ 
                  margin: 0, 
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: isToday ? '#1e40af' : '#0f172a'
                }}>
                  {date.getDate()}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {daySoins.length === 0 ? (
                  <p style={{ 
                    color: '#94a3b8', 
                    fontSize: '12px', 
                    textAlign: 'center',
                    margin: '16px 0'
                  }}>
                    Aucun soin
                  </p>
                ) : (
                  daySoins.map(s => (
                    <Link 
                      key={s.id}
                      to={`/paramedical/soins/${s.id}`}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '13px',
                        color: '#0f172a',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    >
                      <div style={{ fontWeight: '500' }}>{s.type_soin}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {s.patient_prenom} {s.patient_nom}
                        {s.heure_soin && ` à ${s.heure_soin}`}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlanningSoins;