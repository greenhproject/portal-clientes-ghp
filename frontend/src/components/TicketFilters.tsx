import React, { useState } from 'react';
import '../styles/TicketFilters.css';

interface TicketFiltersProps {
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  search: string;
  status: string;
  priority: string;
  category: string;
  dateFrom: string;
  dateTo: string;
  orderBy: string;
  orderDir: string;
  assignedTo?: string;
}

const TicketFilters: React.FC<TicketFiltersProps> = ({ onFilterChange }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: '',
    priority: '',
    category: '',
    dateFrom: '',
    dateTo: '',
    orderBy: 'created_at',
    orderDir: 'desc',
  });

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters: FilterState = {
      search: '',
      status: '',
      priority: '',
      category: '',
      dateFrom: '',
      dateTo: '',
      orderBy: 'created_at',
      orderDir: 'desc',
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status) count++;
    if (filters.priority) count++;
    if (filters.category) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.assignedTo) count++;
    return count;
  };

  return (
    <div className="ticket-filters">
      {/* Barra de búsqueda */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 Buscar por ID, cliente, email, proyecto, título..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="search-input"
        />
        <button 
          className="filter-toggle-btn"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? '▲' : '▼'} Filtros {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
        </button>
        {getActiveFilterCount() > 0 && (
          <button className="clear-filters-btn" onClick={handleClearFilters}>
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filters-grid">
            {/* Estado */}
            <div className="filter-group">
              <label>Estado</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">Todos</option>
                <option value="new">Nuevo</option>
                <option value="assigned">Asignado</option>
                <option value="in_progress">En Progreso</option>
                <option value="pending_client">Pendiente Cliente</option>
                <option value="resolved">Resuelto</option>
                <option value="closed">Cerrado</option>
              </select>
            </div>

            {/* Prioridad */}
            <div className="filter-group">
              <label>Prioridad</label>
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
              >
                <option value="">Todas</option>
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>

            {/* Categoría */}
            <div className="filter-group">
              <label>Categoría</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="">Todas</option>
                <option value="electrical">Eléctrico</option>
                <option value="mechanical">Mecánico</option>
                <option value="performance">Rendimiento</option>
                <option value="other">Otro</option>
              </select>
            </div>

            {/* Ordenar por */}
            <div className="filter-group">
              <label>Ordenar por</label>
              <select
                value={filters.orderBy}
                onChange={(e) => handleFilterChange('orderBy', e.target.value)}
              >
                <option value="created_at">Fecha de creación</option>
                <option value="updated_at">Última actualización</option>
                <option value="priority">Prioridad</option>
                <option value="status">Estado</option>
              </select>
            </div>

            {/* Dirección de orden */}
            <div className="filter-group">
              <label>Orden</label>
              <select
                value={filters.orderDir}
                onChange={(e) => handleFilterChange('orderDir', e.target.value)}
              >
                <option value="desc">Descendente</option>
                <option value="asc">Ascendente</option>
              </select>
            </div>

            {/* Fecha desde */}
            <div className="filter-group">
              <label>Desde</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>

            {/* Fecha hasta */}
            <div className="filter-group">
              <label>Hasta</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketFilters;

