import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  LinearProgress, 
  List, 
  ListItem, 
  ListItemText, 
  Divider, 
  Chip,
  Avatar
} from '@mui/material';
import { Star, TrendingUp, AttachMoney, AssignmentTurnedIn } from '@mui/icons-material';
import axios from 'axios';

interface Rating {
  ticket_id: string;
  rating: number;
  comment: string;
  created_at: string;
  client_name: string;
}

interface PerformanceMetrics {
  average_rating: number;
  total_ratings: number;
  bonus_amount: number;
  tickets_resolved: number;
  ratings_breakdown: { [key: number]: number };
  recent_ratings: Rating[];
}

const Performance: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('https://soporte-backend-ghp.up.railway.app/api/users/me/performance', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMetrics(response.data);
      } catch (error) {
        console.error('Error fetching performance metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) return <LinearProgress />;
  if (!metrics) return <Typography>No se pudieron cargar las métricas.</Typography>;

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return '#2E7D32'; // Green
    if (rating >= 4.0) return '#F9A825'; // Yellow
    return '#C62828'; // Red
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: '#1B5E20', fontWeight: 'bold', mb: 4 }}>
        Mi Desempeño
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Average Rating Card */}
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ height: '100%', borderTop: `6px solid ${getRatingColor(metrics.average_rating)}` }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Calificación Promedio
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 2 }}>
                <Typography variant="h2" sx={{ fontWeight: 'bold', color: getRatingColor(metrics.average_rating) }}>
                  {metrics.average_rating.toFixed(1)}
                </Typography>
                <Star sx={{ fontSize: 40, color: '#FFD700', ml: 1 }} />
              </Box>
              <Typography variant="body2" color="textSecondary">
                Basado en {metrics.total_ratings} calificaciones
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Bonus Card */}
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ height: '100%', borderTop: '6px solid #1565C0' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Bono Estimado
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 2 }}>
                <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#1565C0' }}>
                  ${metrics.bonus_amount.toLocaleString()}
                </Typography>
                <AttachMoney sx={{ fontSize: 40, color: '#1565C0' }} />
              </Box>
              <Typography variant="body2" color="textSecondary">
                Calculado al {new Date().toLocaleDateString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Tickets Resolved Card */}
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ height: '100%', borderTop: '6px solid #7B1FA2' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Tickets Resueltos
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 2 }}>
                <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#7B1FA2' }}>
                  {metrics.tickets_resolved}
                </Typography>
                <AssignmentTurnedIn sx={{ fontSize: 40, color: '#7B1FA2', ml: 1 }} />
              </Box>
              <Typography variant="body2" color="textSecondary">
                Este mes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Ratings List */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingUp sx={{ mr: 1 }} /> Calificaciones Recientes
            </Typography>
            <List>
              {metrics.recent_ratings.map((rating, index) => (
                <React.Fragment key={rating.ticket_id}>
                  <ListItem alignItems="flex-start">
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle1" component="span" sx={{ fontWeight: 'bold' }}>
                            Ticket #{rating.ticket_id}
                          </Typography>
                          <Chip 
                            icon={<Star sx={{ fontSize: '16px !important' }} />} 
                            label={rating.rating} 
                            color={rating.rating >= 4 ? "success" : rating.rating >= 3 ? "warning" : "error"} 
                            size="small" 
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.primary" gutterBottom>
                            {rating.comment || "Sin comentario"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(rating.created_at).toLocaleDateString()} - {rating.client_name}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < metrics.recent_ratings.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
              {metrics.recent_ratings.length === 0 && (
                <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                  No hay calificaciones recientes.
                </Typography>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Rating Distribution */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Distribución
            </Typography>
            <Box sx={{ mt: 2 }}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = metrics.ratings_breakdown[star] || 0;
                const percentage = metrics.total_ratings > 0 ? (count / metrics.total_ratings) * 100 : 0;
                return (
                  <Box key={star} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ minWidth: 20 }}>{star}</Typography>
                      <Star sx={{ fontSize: 16, color: '#FFD700', mr: 1 }} />
                      <Typography variant="body2" color="textSecondary">({count})</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={percentage} 
                      sx={{ 
                        height: 8, 
                        borderRadius: 4,
                        bgcolor: '#f0f0f0',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: star >= 4 ? '#2E7D32' : star === 3 ? '#F9A825' : '#C62828'
                        }
                      }} 
                    />
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Performance;
