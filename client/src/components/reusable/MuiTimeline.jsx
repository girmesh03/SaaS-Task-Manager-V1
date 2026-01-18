/**
 * MuiTimeline Component - Reusable Timeline
 *
 */

import { forwardRef } from "react";
import Timeline from "@mui/lab/Timeline";
import TimelineItem from "@mui/lab/TimelineItem";
import TimelineSeparator from "@mui/lab/TimelineSeparator";
import TimelineConnector from "@mui/lab/TimelineConnector";
import TimelineContent from "@mui/lab/TimelineContent";
import TimelineDot from "@mui/lab/TimelineDot";
import TimelineOppositeContent from "@mui/lab/TimelineOppositeContent";

const MuiTimeline = forwardRef(
  (
    {
      items = [], // Array of { id, content, oppositeContent, dotColor, dotVariant, icon }
      position = "right", // left | right | alternate | alternate-reverse
      sx,
      ...muiProps
    },
    ref
  ) => {
    return (
      <Timeline ref={ref} position={position} sx={sx} {...muiProps}>
        {items.map((item, index) => (
          <TimelineItem key={item.id || index}>
            {/* Only render OppositeContent if provided or if position allows space for it */}
            {item.oppositeContent && (
              <TimelineOppositeContent color="text.secondary">
                {item.oppositeContent}
              </TimelineOppositeContent>
            )}

            <TimelineSeparator>
              <TimelineDot
                color={item.dotColor || "primary"}
                variant={item.dotVariant || "filled"}
              >
                {item.icon}
              </TimelineDot>
              {index < items.length - 1 && <TimelineConnector />}
            </TimelineSeparator>

            <TimelineContent>{item.content}</TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    );
  }
);

MuiTimeline.displayName = "MuiTimeline";

export default MuiTimeline;
