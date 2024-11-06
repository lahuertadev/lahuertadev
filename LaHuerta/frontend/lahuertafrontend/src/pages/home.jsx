import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import ActionAreaCard from '../components/Card';
import { cardOptions } from '../constants/cardOptions';

const Home = () => {
  // const location = useLocation();
  // const hideButtons = ['/expenses/create', '/expenses/list'];

  return (
    <div className='container mx-auto h-full items-center justify-center flex flex-col'>
      <h1 className='text-white font-bold text-3xl'>Bienvenido al sistema de Gestión de La Huerta</h1>
      <br></br>
      <br></br>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cardOptions.map((card, index) => (
          <ActionAreaCard
            key={index}
            title={card.title}
            description={card.description}
            url={card.url}
            img={card.img}
            imgDescription={card.imgDescription}
          />
        ))}
      </div>
      
      <Outlet />
    </div>
  );
};

export default Home;