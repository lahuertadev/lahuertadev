import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';
import { useNavigate } from 'react-router-dom';

export default function ActionAreaCard({ title, description, url, img, imgDescription }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(url);
  };

  return (
    <Card sx={{ maxWidth: 345 }}>
      <CardActionArea onClick={handleClick}>
        <CardMedia
          component="img"
          height="140"
          image={img}
          alt={imgDescription}
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {description}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
