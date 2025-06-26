import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface D3VisualizationProps {
  data: any;
  width: number;
  height: number;
  onRender: (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, data: any) => void;
  className?: string;
}

export const D3Visualization: React.FC<D3VisualizationProps> = ({
  data,
  width,
  height,
  onRender,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    
    // Clear previous content
    svg.selectAll('*').remove();
    
    // Set up SVG dimensions
    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // Call the render function
    onRender(svg, data);

    // Cleanup function
    return () => {
      svg.selectAll('*').remove();
    };
  }, [data, width, height, onRender]);

  return (
    <div className={`d3-visualization ${className}`}>
      <svg ref={svgRef} />
    </div>
  );
}; 