import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Rating,
  Chip,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  Star,
  AttachMoney,
  AccessTime,
  CheckCircle
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface PerformanceMetrics {
  average_rating: number;
  total_ratings: number;
  current_bonus: number;
  tickets_resolved_this_month: number;
  rating_breakdown: Record<string, number>;
  recent_ratings: Array<{
    rating: number;
    comment: string;
    created_at: string;
    ticket_id: number;
  }>;
}

const Performance: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        // Use the new method added to ApiService
        const data = await api.getMyPerformance();
        setMetrics(data);
      } catch (error) {
        console.error('Error fetching performance metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformance();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!metrics) {
    return (
      <Box p={3}>
        <Typography variant="h5" color="error">
          No se pudieron cargar las métricas.
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Mi Desempeño
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        Hola, {user?.name}. Aquí está tu resumen de rendimiento este mes.
      </Typography>

      <Grid container spacing={3} mt={2}>
        {/* Tarjetas de Resumen */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', bgcolor: '#e3f2fd' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Star color="primary" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h6" color="textSecondary">
                    Calificación Promedio
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <Typography variant="h3" component="span" fontWeight="bold">
                      {metrics.average_rating.toFixed(1)}
                    </Typography>
                    <Typography variant="subtitle1" component="span" color="textSecondary" ml={1}>
                      / 5.0
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Rating value={metrics.average_rating} precision={0.1} readOnly />
              <Typography variant="body2" color="textSecondary" mt={1}>
                Basado en {metrics.total_ratings} calificaciones
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', bgcolor: '#e8f5e9' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <AttachMoney color="success" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h6" color="textSecondary">
                    Bono Estimado
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="success.main">
                    ${metrics.current_bonus.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Incluye bonos por horas extra (1.5x)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', bgcolor: '#fff3e0' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <CheckCircle color="warning" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h6" color="textSecondary">
                    Tickets Resueltos
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {metrics.tickets_resolved_this_month}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Este mes
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Desglose de Calificaciones */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Desglose de Calificaciones
            </Typography>
            <Box mt={2}>
              {[5, 4, 3, 2, 1].map((star) => (
                <Box key={star} display="flex" alignItems="center" mb={1}>
                  <Typography minWidth={30}>{star} ★</Typography>
                  <Box flexGrow={1} mx={2} sx={{ bgcolor: '#eee', height: 10, borderRadius: 5 }}>
                    <Box
                      sx={{
                        width: `${(metrics.rating_breakdown[star] || 0) / metrics.total_ratings * 100}%`,
                        bgcolor: star >= 4 ? '#4caf50' : star === 3 ? '#ff9800' : '#f44336',
                        height: '100%',
                        borderRadius: 5,
                        transition: 'width 0.5s ease-in-out'
                      }}
                    />
                  </Box>
                  <Typography minWidth={30} align="right">
                    {metrics.rating_breakdown[star] || 0}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Calificaciones Recientes */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Comentarios Recientes
            </Typography>
            <List>
              {metrics.recent_ratings.map((rating, index) => (
                <React.Fragment key={index}>
                  <ListItem alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: rating.rating >= 4 ? '#4caf50' : '#ff9800' }}>
                        {rating.rating}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" justifyContent="space-between">
                          <Rating value={rating.rating} readOnly size="small" />
                          <Typography variant="caption" color="textSecondary">
                            {new Date(rating.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="textPrimary">
                            Ticket #{rating.ticket_id}
                          </Typography>
                          {" — "}{rating.comment || "Sin comentario"}
                        </>
                      }
                    />
                  </ListItem>
                  {index < metrics.recent_ratings.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
              {metrics.recent_ratings.length === 0 && (
                <Typography color="textSecondary" align="center" py={2}>
                  No hay calificaciones recientes.
                </Typography>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Performance;
