# Tech Stack

- You are building a React application.
- Use TypeScript.
- Use React Router. KEEP the routes in src/App.tsx
- Always put source code in the src folder.
- Put pages into src/pages/
- Put components into src/components/
- The main page (default page) is src/pages/Index.tsx
- UPDATE the main page to include the new components. OTHERWISE, the user can NOT see any components!
- ALWAYS try to use the shadcn/ui library.
- Tailwind CSS: always use Tailwind CSS for styling components. Utilize Tailwind classes extensively for layout, spacing, colors, and other design aspects.

Available packages and libraries:

- The lucide-react package is installed for icons.
- You ALREADY have ALL the shadcn/ui components and their dependencies installed. So you don't need to install them again.
- You have ALL the necessary Radix UI components installed.
- Use prebuilt components from the shadcn/ui library after importing them. Note that these files shouldn't be edited, so make new components if you need to change them.

# Error Prevention and Best Practices

To ensure code quality and prevent common errors, adhere to the following practices:

1.  **Leverage Linting and Static Analysis Tools:** Utilize tools like ESLint to catch unused imports, unused variables, and potential code quality issues early in the development cycle. Integrate these tools into the workflow to enforce consistent code style and identify problems before they lead to build failures.
2.  **Strict TypeScript Configuration:** Maintain a strict TypeScript configuration (`"strict": true` in `tsconfig.json`) to enforce robust type checking. This helps catch type mismatches and related errors at compile time, significantly reducing runtime bugs.
3.  **Thorough Code Reviews:** Encourage comprehensive code reviews to identify issues that automated tools might miss. Code reviews provide an opportunity for peer feedback, knowledge sharing, and ensuring adherence to best practices.
4.  **Understand Library APIs and Types:** When using third-party libraries, always consult their official documentation and TypeScript definitions. Understand the expected types for props, event handlers, and return values to ensure correct integration and prevent type-related errors. In rare cases where a library's type definition is overly strict, use type assertions judiciously and with clear justification.
5.  **Eliminate Unused Code:** Regularly review and remove unused imports, variables, functions, and components. This reduces bundle size, improves readability, and prevents potential confusion or dead code.