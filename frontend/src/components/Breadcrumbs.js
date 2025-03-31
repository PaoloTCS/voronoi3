import React from 'react';

const Breadcrumbs = ({ path, onNavigate }) => {
  return (
    <div className="breadcrumbs">
      <span 
        className="breadcrumb-item home"
        onClick={() => onNavigate(0)}
      >
        Home
      </span>
      
      {path.map((item, index) => (
        <React.Fragment key={index}>
          <span className="breadcrumb-separator">/</span>
          <span 
            className="breadcrumb-item"
            onClick={() => onNavigate(index + 1)}
          >
            {item}
          </span>
        </React.Fragment>
      ))}
      
      <style jsx="true">{`
        .breadcrumbs {
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 6px;
          margin-bottom: 15px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
          font-size: 14px;
        }
        
        .breadcrumb-item {
          color: #3498db;
          cursor: pointer;
          font-weight: 500;
        }
        
        .breadcrumb-item:hover {
          text-decoration: underline;
        }
        
        .breadcrumb-separator {
          margin: 0 8px;
          color: #999;
        }
        
        .breadcrumb-item.home {
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default Breadcrumbs;